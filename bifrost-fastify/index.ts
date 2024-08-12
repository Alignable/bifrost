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
import { AugmentMe } from "@alignable/bifrost";

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
  _bfproxy?: {
    isPageContext: boolean;
    originalUrl?: string;
  };
};

function streamToString(stream: Writable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

const wrappedProxyPageId = "/proxy/pages/wrapped";
const passthruProxyPageId = "/proxy/pages/passthru";

interface ViteProxyPluginOptions {
  upstream: URL;
  host: URL;
  onError?: (error: any, pageContext: RenderedPageContext) => void;
  buildPageContextInit?: (
    req: FastifyRequest
  ) => Promise<AugmentMe.PageContextInit>;
  getLayout: (reply: FastifyReply<RawServerBase>) => {
    layout: string;
    layoutProps: AugmentMe.LayoutProps;
  };
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
    rewriteRequestHeaders,
    getLayout,
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

        const proxy = pageContext._pageId === wrappedProxyPageId;
        const passthruProxy = pageContext._pageId === passthruProxyPageId;

        if (passthruProxy) {
          req.log.info(`bifrost: passthru proxy to backend`);
          // passthru proxy
          return;
        } else if (!proxy) {
          req.log.info(`bifrost: rendering page ${pageContext._pageId}`);
          return replyWithPage(reply, pageContext);
        } else if (proxy) {
          req.log.info(`bifrost: proxy route matched, proxying to backend`);
          const isPageContext = !!pageContext.isClientSideNavigation;
          (req.raw as RawRequestExtendedWithProxy)._bfproxy = {
            isPageContext,
            originalUrl: req.raw.url,
          };
          if (isPageContext) {
            // page context expects json - we need html from legacy server
            req.raw.headers["accept"] = "text/html";
            // pageContext.json is added on client navigations to indicate we are returning just json for the client router
            // we have to remove it before proxying though.
            req.raw.url = req.raw.url!.replace("/index.pageContext.json", "");
          }
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
        const { isPageContext = false, originalUrl = undefined } =
          (req.raw as RawRequestExtendedWithProxy)._bfproxy || {};
        if (isPageContext && originalUrl) {
          // restore url rewrite
          req.raw.url = originalUrl;
        }

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
            if (isPageContext) {
              return reply
                .status(200)
                .type("application/json")
                .send(
                  JSON.stringify({
                    _pageId: wrappedProxyPageId,
                    redirectTo: url,
                  })
                );
            } else {
              return reply.send(res);
            }
          }
        }

        const { layout, layoutProps } = getLayout(reply);
        if (!isPageContext && !layout) {
          return reply.send(res);
        }

        const html = await streamToString(res);

        const pageContextInit = {
          urlOriginal: req.url,
          fromProxy: {
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
