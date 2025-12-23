// Note that this file isn't processed by Vite, see https://github.com/brillout/vike/issues/562
import {
  FastifyReply,
  RawServerBase,
  FastifyPluginAsync,
  RouteGenericInterface,
} from "fastify";
import { FastifyRequest, RequestGenericInterface } from "fastify/types/request";
import proxy, { type FastifyHttpProxyOptions } from "@fastify/http-proxy";
import accepts from "@fastify/accepts";
import forwarded from "@fastify/forwarded";
import type { GetLayout, WrappedServerOnly } from "@alignable/bifrost/config";
import { PassThrough, Writable } from "stream";
import { renderPage } from "vike/server";
import { PageContextServer } from "vike/types";
import { extractDomElements } from "./lib/extractDomElements";
import { Http2ServerRequest } from "http2";
import { IncomingMessage } from "http";
import { text } from "node:stream/consumers";

type RenderedPageContext = Awaited<
  ReturnType<
    typeof renderPage<
      {
        isClientSideNavigation?: boolean;
      },
      { urlOriginal: string }
    >
  >
>;

declare module "fastify" {
  interface FastifyRequest {
    bifrostPageId?: string | null;
    vikePageContext?: Partial<PageContextServer> | null;
    getLayout: GetLayout | null;
    customPageContextInit: Partial<Omit<PageContextServer, "headers">> | null;
  }
}

type RawRequestExtendedWithProxy = FastifyRequest<
  RequestGenericInterface,
  RawServerBase
>["raw"] & {
  _bfproxy?: boolean;
};

interface ViteProxyPluginOptions
  extends Omit<
    FastifyHttpProxyOptions,
    "upstream" | "preHandler" | "replyOptions"
  > {
  upstream: URL;
  host: URL;
  onError?: (error: any, pageContext: RenderedPageContext) => void;
  buildPageContextInit?: (
    req: FastifyRequest
  ) => Promise<Partial<Omit<PageContextServer, "headers">>>;
}
/**
 * Fastify plugin that wraps @fasitfy/http-proxy to proxy Rails/Turbolinks server into a vike site.
 */
export const viteProxyPlugin: FastifyPluginAsync<
  ViteProxyPluginOptions
> = async (fastify, opts) => {
  const { upstream, host, onError, buildPageContextInit } = opts;
  async function replyWithPage(
    reply: FastifyReply<RouteGenericInterface, RawServerBase>,
    pageContext: RenderedPageContext
  ): Promise<FastifyReply> {
    const { httpResponse } = pageContext;

    if (
      onError &&
      httpResponse?.statusCode === 500 &&
      pageContext.errorWhileRendering
    ) {
      onError(pageContext.errorWhileRendering, pageContext);
    }

    if (!httpResponse) {
      return reply.code(404).type("text/html").send("Not Found");
    }

    const { pipe, statusCode, headers } = httpResponse;
    const stream = new PassThrough();
    pipe(stream);
    return reply
      .status(statusCode)
      .headers(Object.fromEntries(headers))
      .send(stream);
  }
  await fastify.register(accepts);
  fastify.decorateRequest("bifrostPageId", null);
  fastify.decorateRequest("vikePageContext", null);
  fastify.decorateRequest("getLayout", null);
  fastify.decorateRequest("customPageContextInit", null);
  await fastify.register(proxy, {
    ...opts,
    upstream: upstream.href,
    websocket: true,
    async preHandler(req, reply) {
      if (
        (req.method === "GET" || req.method === "HEAD") &&
        req.accepts().type(["html"]) === "html"
      ) {
        req.customPageContextInit = buildPageContextInit
          ? await buildPageContextInit(req)
          : {};

        const pageContextInit = {
          urlOriginal: req.url,
          headersOriginal: req.headers,
          ...req.customPageContextInit,
        };

        const pageContext = await renderPage(pageContextInit);

        // this does not handle getting the original pageId when errors are thrown: https://github.com/vikejs/vike/issues/1112
        req.bifrostPageId = pageContext.pageId;
        req.vikePageContext = pageContext;

        const proxyMode = pageContext.config?.proxyMode;

        switch (proxyMode) {
          case "passthru": {
            req.log.info(`bifrost: passthru proxy to backend`);
            return;
          }
          case "wrapped": {
            req.log.info(`bifrost: proxy route matched, proxying to backend`);
            if (!!pageContext.isClientSideNavigation) {
              // This should never happen because wrapped proxy routes have no onBeforeRender. onRenderClient should make a request to the legacy backend.
              req.log.error(
                "Wrapped proxy route is requesting index.pageContext.json. Something is wrong with the client."
              );
              return reply.redirect(
                req.url.replace("/index.pageContext.json", "")
              );
            }
            if (!pageContext.config?.getLayout) {
              req.log.error(
                "Config missing getLayout on wrapped route! Falling back to passthru proxy"
              );
              return;
            }

            let proxyHeadersAlreadySet = true;
            for (const [key, val] of Object.entries(
              pageContext.config?.proxyHeaders || {}
            )) {
              proxyHeadersAlreadySet &&= req.headers[key.toLowerCase()] == val;
              req.headers[key.toLowerCase()] = val;
            }
            // If proxy headers set, this is a client navigation meant to go direct to legacy backend.
            // Use passthru proxy in this case.
            // ALB CANNOT be used for this. see `onBeforeRenderClient` for details
            if (proxyHeadersAlreadySet) return;

            (req.raw as RawRequestExtendedWithProxy)._bfproxy = true;
            req.getLayout = pageContext.config.getLayout;
            return;
          }
          default:
            req.log.info(`bifrost: rendering page ${pageContext.pageId}`);
            return replyWithPage(reply, pageContext);
        }
      }
    },
    replyOptions: {
      rewriteRequestHeaders(request, headers) {
        if (!(request.raw instanceof Http2ServerRequest)) {
          const fwd = forwarded(request.raw).reverse();
          headers["X-Forwarded-For"] = fwd.join(", ");
          headers["X-Forwarded-Host"] = host.host;
          headers["X-Forwarded-Proto"] = host.protocol;
        }

        if ((request.raw as RawRequestExtendedWithProxy)._bfproxy) {
          // Proxying and wrapping

          // Delete cache headers
          delete headers["if-modified-since"];
          delete headers["if-none-match"];
          delete headers["if-unmodified-since"];
          delete headers["if-none-match"];
          delete headers["if-range"];
        }
        return headers;
      },
      async onResponse(req, reply, res) {
        if ([301, 302, 303, 307, 308].includes(reply.statusCode)) {
          const location = reply.getHeader("location") as string;
          if (location) {
            const url = new URL(location, host.href);
            if (url.host === upstream.host || url.host === host.host) {
              // rewrite redirect on upstream's host to the proxy host
              url.host = host.host;
              url.protocol = host.protocol;
            }
            reply.header("location", url);
            return reply.send("stream" in res ? res.stream : res);
          }
        }

        const proxyLayoutInfo = req.getLayout?.(reply.getHeaders());
        if (!proxyLayoutInfo) {
          return reply.send("stream" in res ? res.stream : res);
        }

        const html = await text(res.stream);

        const { bodyAttributes, bodyInnerHtml, headInnerHtml } =
          extractDomElements(html);

        if (!bodyInnerHtml || !headInnerHtml) {
          return reply.send(html);
        }

        const pageContextInit = {
          urlOriginal: req.url,
          headersOriginal: req.headers,
          // Critical that we don't set any passToClient values in pageContextInit
          // If we do, Vike re-requests pageContext on client navigation. This breaks wrapped proxy.
          _wrappedServerOnly: {
            bodyAttributes,
            bodyInnerHtml,
            headInnerHtml,
            proxyLayoutInfo,
          } satisfies WrappedServerOnly,
          ...req.customPageContextInit,
        };
        const pageContext = await renderPage(pageContextInit);
        return replyWithPage(reply, pageContext);
      },
    },
  });
};
