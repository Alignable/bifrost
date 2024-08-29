// Note that this file isn't processed by Vite, see https://github.com/brillout/vike/issues/562
import { FastifyReply, RawServerBase, FastifyPluginAsync } from "fastify";
import { FastifyRequest, RequestGenericInterface } from "fastify/types/request";
import proxy from "@fastify/http-proxy";
import accepts from "@fastify/accepts";
import forwarded from "@fastify/forwarded";
import { Writable } from "stream";
import { IncomingHttpHeaders, IncomingMessage } from "http";
import {
  Http2ServerRequest,
  IncomingHttpHeaders as Http2IncomingHttpHeaders,
} from "http2";
import { renderPage } from "vike/server";
import { AugmentMe, GetLayout } from "@alignable/bifrost";

type RenderedPageContext = Awaited<
  ReturnType<
    typeof renderPage<
      {
        redirectTo?: string;
        isClientSideNavigation?: boolean;
        _pageId?: string;
      },
      { urlOriginal: string }
    >
  >
>;

declare module "fastify" {
  interface FastifyRequest {
    bifrostPageId?: string;
  }
}

type RawRequestExtendedWithProxy = FastifyRequest<
  RequestGenericInterface,
  RawServerBase
>["raw"] & {
  _bfproxy?: boolean;
};

function streamToString(stream: Writable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

interface ViteProxyPluginOptions {
  upstream: URL;
  host: URL;
  onError?: (error: any, pageContext: RenderedPageContext) => void;
  buildPageContextInit?: (
    req: FastifyRequest
  ) => Promise<AugmentMe.PageContextInit>;
  getLayout: GetLayout;
  /// Use to signal to legacy backend to return special results (eg. remove navbar etc)
  rewriteRequestHeaders?: (
    req: Http2ServerRequest | IncomingMessage,
    headers: Http2IncomingHttpHeaders | IncomingHttpHeaders
  ) => Http2IncomingHttpHeaders | IncomingHttpHeaders;
}
/**
 * Fastify plugin that wraps @fasitfy/http-proxy to proxy Rails/Turbolinks server into a vike site.
 */
export const viteProxyPlugin: FastifyPluginAsync<
  ViteProxyPluginOptions
> = async (
  fastify,
  {
    upstream,
    host,
    onError,
    buildPageContextInit,
    getLayout,
    rewriteRequestHeaders,
  }
) => {
  async function replyWithPage(
    reply: FastifyReply<RawServerBase>,
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

    if (pageContext.redirectTo && !pageContext.isClientSideNavigation) {
      return reply.redirect(307, pageContext.redirectTo);
    }

    if (!httpResponse) {
      return reply.code(404).type("text/html").send("Not Found");
    }

    const { body, statusCode, headers } = httpResponse;
    return reply
      .status(statusCode)
      .headers(Object.fromEntries(headers))
      .send(body);
  }
  await fastify.register(accepts);
  fastify.decorateRequest("bifrostPageId", null);
  await fastify.register(proxy, {
    upstream: upstream.href,
    websocket: true,
    async preHandler(req, reply) {
      if (
        (req.method === "GET" || req.method === "HEAD") &&
        req.accepts().type(["html"]) === "html"
      ) {
        const pageContextInit = {
          urlOriginal: req.url,
          ...(buildPageContextInit ? await buildPageContextInit(req) : {}),
        };

        const pageContext = await renderPage<
          { _pageId: string },
          typeof pageContextInit
        >(pageContextInit);

        // should stop relying on unstable _debugRouteMatches after this issue is closed: https://github.com/vikejs/vike/issues/1112
        const originalPageId =
          (pageContext as any)?._debugRouteMatches?.[0]?.pageId ||
          pageContext._pageId;
        req.bifrostPageId = originalPageId;

        const proxyMode = pageContext.config?.proxyMode;

        switch (proxyMode) {
          case "passthru": {
            req.log.info(`bifrost: passthru proxy to backend`);
            return;
          }
          case "wrapped": {
            req.log.info(`bifrost: proxy route matched, proxying to backend`);
            (req.raw as RawRequestExtendedWithProxy)._bfproxy = true;
            if (!!pageContext.isClientSideNavigation) {
              // This should never happen because wrapped proxy routes have no onBeforeRender. onRenderClient should make a request to the legacy backend.
              req.log.error(
                "Wrapped proxy route is requesting index.pageContext.json. Something is wrong with the client."
              );
              return reply.redirect(
                req.url.replace("/index.pageContext.json", "")
              );
            }
            return;
          }
          default:
            req.log.info(`bifrost: rendering page ${pageContext._pageId}`);
            return replyWithPage(reply, pageContext);
        }
      }
    },
    replyOptions: {
      rewriteRequestHeaders(request, headers) {
        const fwd = forwarded(request as IncomingMessage).reverse();
        // fwd.push(request.ip); TODO: not sure if this is needed
        headers["X-Forwarded-For"] = fwd.join(", ");
        headers["X-Forwarded-Host"] = host.host;
        headers["X-Forwarded-Proto"] = host.protocol;

        if ((request as RawRequestExtendedWithProxy)._bfproxy) {
          // Proxying and wrapping

          // Delete cache headers
          delete headers["if-modified-since"];
          delete headers["if-none-match"];
          delete headers["if-unmodified-since"];
          delete headers["if-none-match"];
          delete headers["if-range"];
          if (rewriteRequestHeaders) {
            return rewriteRequestHeaders(request, headers);
          }
        }
        return headers;
      },
      async onResponse(req, reply: FastifyReply<RawServerBase>, res) {
        if ([301, 302, 303, 307, 308].includes(reply.statusCode)) {
          const location = reply.getHeader("location") as string;
          if (location) {
            const url = new URL(location);
            if (url.host === upstream.host || url.host === host.host) {
              // rewrite redirect on upstream's host to the proxy host
              url.host = host.host;
              url.protocol = host.protocol;
            }
            reply.header("location", url);
            return reply.send(res);
          }
        }

        const { layout, layoutProps } = getLayout(reply.getHeaders());
        if (!layout) {
          return reply.send(res);
        }

        const html = await streamToString(res);

        const pageContextInit = {
          urlOriginal: req.url,
          // Critical that we don't set any passToClient values in pageContextInit
          // If we do, Vike re-requests pageContext on client navigation. This breaks wrapped proxy.
          wrappedServerOnly: {
            layout,
            layoutProps,
            html,
          },
        };
        const pageContext = await renderPage(pageContextInit);
        return replyWithPage(reply, pageContext);
      },
    },
  });
};
