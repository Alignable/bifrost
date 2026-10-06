// Note that this file isn't processed by Vite, see https://github.com/brillout/vike/issues/562
import {
  FastifyReply,
  RawServerBase,
  FastifyPluginAsync,
  RouteGenericInterface,
} from "fastify";
import { FastifyRequest, RequestGenericInterface } from "fastify/types/request";
import proxy, { type FastifyHttpProxyOptions } from "@fastify/http-proxy";
import type { FastifyReplyFromHooks } from "@fastify/reply-from";
import accepts from "@fastify/accepts";
import type { GetLayout, WrappedPage } from "@alignable/bifrost/config";
import { renderPage } from "vike/server";
import { PageContextServer } from "vike/types";
import { extractDomElements } from "./lib/extractDomElements";
import { Http2ServerRequest } from "http2";
import { text } from "node:stream/consumers";
import { parse as parseContentType } from "fast-content-type-parse";
import { IncomingMessage } from "http";

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

type UpstreamResponse = Parameters<
  NonNullable<FastifyReplyFromHooks["onResponse"]>
>[2];
/** Backend response held back from the client while Bifrost decides whether to wrap it */
type Upstream = { res: UpstreamResponse } | { body: string } | { error: Error };

declare module "fastify" {
  interface FastifyRequest {
    /// Actual ProxyMode after processing  backend server results, which can tell us to fallback to passthru or redirect
    bifrostProxyMode?: Vike.Config["proxyMode"];
    /// whether we sent proxy headers to legacy backend
    bifrostSentProxyHeaders?: boolean;
    bifrostProxyLayout?: Vike.ProxyLayoutInfo | null;
    /// Only set when proxy mode is false or wrapped
    vikePageContext?: Partial<PageContextServer> | null;
    getLayout: GetLayout | null;
    layoutHeaders: string[] | null;
    /// Set while a wrapped page waits for the backend response, so onResponse hands it over instead of sending it
    bifrostAwaitUpstream: ((upstream: Upstream) => void) | null;
  }
}

type RawRequestExtendedWithProxy = FastifyRequest<
  RequestGenericInterface,
  RawServerBase
>["raw"] & {
  /** Headers to add to the backend request for a wrapped page */
  _bfproxyHeaders?: Record<string, string>;
};

interface ViteProxyPluginOptions extends Omit<
  FastifyHttpProxyOptions,
  "upstream" | "preHandler" | "replyOptions"
> {
  upstream: URL;
  host: URL;
  onError?: (error: any, pageContext: RenderedPageContext) => void;
  buildPageContextInit?: (
    req: FastifyRequest<RequestGenericInterface, RawServerBase>
  ) => Promise<Partial<Omit<PageContextServer, "headers">>>;
  beforeWrappedRender?: (
    req: FastifyRequest<RequestGenericInterface, RawServerBase>,
    reply: FastifyReply<
      RouteGenericInterface,
      RawServerBase,
      IncomingMessage | Http2ServerRequest
    >
  ) => void;
}

const isRedirect = (statusCode: number) =>
  [301, 302, 303, 307, 308].includes(statusCode);

/**
 * Fastify plugin that wraps @fasitfy/http-proxy to proxy Rails/Turbolinks server into a vike site.
 */
export const viteProxyPlugin: FastifyPluginAsync<
  ViteProxyPluginOptions
> = async (fastify, opts) => {
  const { upstream, host, onError, buildPageContextInit, beforeWrappedRender } =
    opts;
  async function replyWithPage(
    reply: FastifyReply<RouteGenericInterface, RawServerBase>,
    pageContext: RenderedPageContext,
    statusCodeFromProxy?: number
  ): Promise<FastifyReply> {
    const { httpResponse } = pageContext;

    if (!httpResponse) {
      return reply.code(404).type("text/html").send("Not Found");
    }

    const { statusCode, headers, getBody } = httpResponse;

    if (onError && statusCode === 500 && pageContext.errorWhileRendering) {
      onError(pageContext.errorWhileRendering, pageContext);
    }

    return (
      reply
        // If there is an error on the Bifrost side, we use the bifrost statusCode, otherwise prefer the proxy's code
        .status(
          pageContext.errorWhileRendering
            ? statusCode
            : (statusCodeFromProxy ?? statusCode)
        )
        .headers(Object.fromEntries(headers))
        // This disables any possibility of real streaming. To re-enable streaming we should adopt vike-photon and rewrite wrapped proxy as a Vike middleware.
        // Why not pipe? Because Vike gives us `pipe` which sends data into a Writable, but Fastify's reply.send only accepts a ReadableStream. Passthrough can convert but causes race conditions
        // We would have to pipe into reply.raw, but that skips Fastify's reply handling (like onSend hooks)
        // Photon/universal-middleware solves this with some hacks around reply.body
        .send(await getBody())
    );
  }

  await fastify.register(accepts);
  fastify.decorateRequest("bifrostProxyMode", false);
  fastify.decorateRequest("bifrostProxyLayout", null);
  fastify.decorateRequest("bifrostSentProxyHeaders", false);
  fastify.decorateRequest("vikePageContext", null);
  fastify.decorateRequest("getLayout", null);
  fastify.decorateRequest("layoutHeaders", null);
  fastify.decorateRequest("bifrostAwaitUpstream", null);
  await fastify.register(proxy, {
    ...opts,
    upstream: upstream.href,
    websocket: true,
    async preHandler(req, reply) {
      if (
        (req.method === "GET" || req.method === "HEAD") &&
        req.accepts().type(["html"]) === "html"
      ) {
        const customPageContextInit = buildPageContextInit
          ? await buildPageContextInit(req)
          : {};

        // Filled in by loadWrappedPage, which the wrapped renderer calls during renderPage
        const wrapped: {
          upstream?: Upstream;
          statusCode?: number;
          layoutHeaders?: string[];
        } = {};
        let wrapping: Promise<WrappedPage | null> | undefined;

        /** Requests the backend through reply-from, resolving with its response instead of sending it */
        function fetchUpstream(href: string) {
          return new Promise<Upstream>((resolve) => {
            const settle = (upstream: Upstream) => {
              if (req.bifrostAwaitUpstream !== settle) return;
              req.bifrostAwaitUpstream = null;
              resolve(upstream);
            };
            req.bifrostAwaitUpstream = settle;
            // reply-from never calls back if an HTTP/2 client disconnects first
            reply.raw.once("close", () =>
              settle({ error: new Error("Client closed the request") })
            );
            const { options } = reply.fromParameters(href);
            reply.from(href, {
              ...(options as any),
              onError: (_reply: unknown, { error }: { error: Error }) =>
                settle({ error }),
            });
          });
        }

        async function loadWrappedPage(
          pageContext: PageContextServer
        ): Promise<WrappedPage | null> {
          const {
            getLayout,
            proxyHeaders = {},
            layoutHeaders,
          } = pageContext.config;
          // Client navigation and missing getLayout are handled after renderPage returns
          if (pageContext.isClientSideNavigation || !getLayout) return null;

          // If proxy headers set, this is a client navigation meant to go direct to legacy backend.
          // ALB CANNOT be used for this. see `onBeforeRenderClient` for details
          const proxyHeadersAlreadySet = Object.entries(proxyHeaders).every(
            ([key, val]) => req.headers[key.toLowerCase()] == val
          );
          if (proxyHeadersAlreadySet) return null;

          // rewriteRequestHeaders adds them to the backend request
          (req.raw as RawRequestExtendedWithProxy)._bfproxyHeaders =
            proxyHeaders;
          wrapped.layoutHeaders = layoutHeaders;
          req.getLayout = getLayout;
          req.bifrostSentProxyHeaders = true;
          req.log.info(`bifrost: proxy route matched, proxying to backend`);

          const upstreamResponse = await fetchUpstream(
            pageContext.urlParsed.href
          );
          wrapped.upstream = upstreamResponse;
          if (!("res" in upstreamResponse) || isRedirect(reply.statusCode))
            return null;

          const proxyLayoutInfo = getLayout(reply.getHeaders());
          req.bifrostProxyLayout = proxyLayoutInfo;
          if (!proxyLayoutInfo) return null;

          const contentType = reply.getHeader("content-type") as
            string | undefined;
          if (
            !contentType ||
            parseContentType(contentType).type !== "text/html"
          ) {
            return null;
          }

          const html = await text(upstreamResponse.res.stream);
          const { bodyAttributes, bodyInnerHtml, headInnerHtml } =
            extractDomElements(html);
          if (!bodyInnerHtml || !headInnerHtml) {
            wrapped.upstream = { body: html };
            return null;
          }

          try {
            beforeWrappedRender?.(req, reply);
          } catch (e) {
            req.log.error(
              `Error in beforeWrappedRender: ${(e as Error).message}`
            );
          }
          // beforeWrappedRender may have changed req (e.g. a session set by the backend)
          const customPageContextInit = buildPageContextInit
            ? await buildPageContextInit(req)
            : {};

          wrapped.statusCode = reply.statusCode;
          // Strip layout headers after getLayout has read them — they are server-side only
          for (const header of layoutHeaders ?? []) {
            reply.removeHeader(header);
          }
          return {
            ...customPageContextInit,
            _wrappedServerOnly: {
              bodyAttributes,
              bodyInnerHtml,
              headInnerHtml,
              proxyLayoutInfo,
            },
          };
        }

        const pageContextInit = {
          urlOriginal: req.url,
          headersOriginal: req.headers,
          // Critical that we don't set any passToClient values in pageContextInit
          // If we do, Vike re-requests pageContext on client navigation. This breaks wrapped proxy.
          // Memoized: an app's +onCreatePageContext may call it too, and Bifrost may render again (see loadWrappedPage)
          _bifrostWrap: {
            load: (pageContext: PageContextServer) =>
              (wrapping ??= loadWrappedPage(pageContext)),
          },
          ...customPageContextInit,
        };

        const pageContext = await renderPage(pageContextInit);

        req.layoutHeaders = pageContext.config?.layoutHeaders ?? null;

        if (wrapped.statusCode !== undefined) {
          req.vikePageContext = pageContext;
          req.bifrostProxyMode = "wrapped";
          // Preserve the upstream's status code (e.g. 404) rather than using Vike's
          return replyWithPage(reply, pageContext, wrapped.statusCode);
        }

        if (wrapped.upstream) {
          // Wrapping failed, e.g. getLayout threw: send the error page rather than the backend's page without its layout
          if (pageContext.errorWhileRendering) {
            const { upstream } = wrapped;
            if ("res" in upstream) {
              const { res } = upstream;
              ("stream" in res ? res.stream : res).destroy();
            }
            for (const header of wrapped.layoutHeaders ?? []) {
              reply.removeHeader(header);
            }
            req.vikePageContext = pageContext;
            req.bifrostProxyMode = "wrapped";
            return replyWithPage(reply, pageContext);
          }
          // The backend already responded but isn't wrappable: send it as-is
          req.bifrostProxyMode = "passthru";
          const response = wrapped.upstream;
          if ("error" in response) return reply.send(response.error);
          if ("body" in response) return reply.send(response.body);
          const { res } = response;
          return reply.send("stream" in res ? res.stream : res);
        }

        let proxyMode = pageContext.config?.proxyMode;
        if (!proxyMode) {
          req.vikePageContext = pageContext;
          req.log.info(`bifrost: rendering page ${pageContext.pageId}`);
          return replyWithPage(reply, pageContext);
        }

        req.bifrostProxyMode = "passthru";
        switch (proxyMode) {
          case "passthru": {
            req.log.info(`bifrost: passthru proxy to backend`);
            break;
          }
          case "wrapped": {
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
            }
            break;
          }
        }

        if (pageContext.urlParsed) {
          const { options } = reply.fromParameters(pageContext.urlParsed.href);
          return reply.from(pageContext.urlParsed.href, options as any);
        }
      }
    },
    replyOptions: {
      rewriteRequestHeaders(request, headers) {
        // Build X-Forwarded-For from existing header + socket address
        const existingFor = request.headers["x-forwarded-for"];
        const clientIp = request.raw.socket?.remoteAddress;
        if (existingFor && clientIp) {
          headers["X-Forwarded-For"] = `${clientIp}, ${existingFor}`;
        } else if (existingFor) {
          headers["X-Forwarded-For"] = existingFor;
        } else if (clientIp) {
          headers["X-Forwarded-For"] = clientIp;
        }
        headers["X-Forwarded-Host"] = host.host;
        headers["X-Forwarded-Proto"] = host.protocol.replace(":", "");

        const proxyHeaders = (request.raw as RawRequestExtendedWithProxy)
          ._bfproxyHeaders;
        if (proxyHeaders) {
          // Proxying and wrapping
          for (const [key, val] of Object.entries(proxyHeaders)) {
            headers[key.toLowerCase()] = val;
          }

          // Delete cache headers
          delete headers["if-modified-since"];
          delete headers["if-none-match"];
          delete headers["if-unmodified-since"];
          delete headers["if-none-match"];
          delete headers["if-range"];
        }
        return headers;
      },
      onResponse(req, reply, res) {
        if (isRedirect(reply.statusCode)) {
          const location = reply.getHeader("location") as string;
          if (location) {
            const url = new URL(location, host.href);
            if (url.host === upstream.host || url.host === host.host) {
              // rewrite redirect on upstream's host to the proxy host
              url.host = host.host;
              url.protocol = host.protocol;
            }
            reply.header("location", url);
          }
        }

        const stream = "stream" in res ? res.stream : res;
        if (req.bifrostAwaitUpstream) return req.bifrostAwaitUpstream({ res });
        // The client disconnected while a wrapped page waited for this response
        if (reply.sent) return stream.destroy();
        return reply.send(stream);
      },
    },
  });
};
