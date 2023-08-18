// Note that this file isn't processed by Vite, see https://github.com/brillout/vite-plugin-ssr/issues/562
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
import { renderPage } from "vite-plugin-ssr/server";
import { AugmentMe } from "@alignable/bifrost";

type RequestExtendedWithProxy = FastifyRequest<
  RequestGenericInterface,
  RawServerBase
> & { _proxy?: { isPageContext: boolean; originalUrl?: string } };

function streamToString(stream: Writable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

async function replyWithPage(
  reply: FastifyReply<RawServerBase>,
  pageContext: Awaited<
    ReturnType<
      typeof renderPage<
        { redirectTo?: string; isClientSideNavigation?: boolean },
        { urlOriginal: string }
      >
    >
  >
): Promise<FastifyReply> {
  const { httpResponse } = pageContext;

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

const proxyPageId = "/proxy/pages";

interface ViteProxyPluginOptions {
  upstream: URL;
  host: URL;
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
 * Fastify plugin that wraps @fasitfy/http-proxy to proxy Rails/Turbolinks server into a Vite-Plugin-SSR site.
 */
export const viteProxyPlugin: FastifyPluginAsync<
  ViteProxyPluginOptions
> = async (
  fastify,
  { upstream, host, buildPageContextInit, rewriteRequestHeaders, getLayout }
) => {
  await fastify.register(accepts);
  await fastify.register(proxy, {
    upstream: upstream.href,
    async preHandler(req, reply) {
      if (req.method === "GET" && req.accepts().type(["html"]) === "html") {
        const pageContextInit = {
          urlOriginal: req.url,
          ...(buildPageContextInit ? await buildPageContextInit(req) : {}),
        };

        const pageContext = await renderPage<
          { _pageId: string },
          typeof pageContextInit
        >(pageContextInit);

        const proxy = pageContext._pageId === proxyPageId;
        const noRouteMatched =
          (pageContext as any).is404 && !pageContext.errorWhileRendering; // we hit no page, but NOT because of an error

        if (noRouteMatched) {
          req.log.info("bifrost: no route match, naked proxy to backend");
          // Naked proxy
          return;
        } else if (!proxy) {
          req.log.info(`bifrost: rendering page ${pageContext._pageId}`);
          return replyWithPage(reply, pageContext);
        } else {
          req.log.info(`bifrost: proxy route matched, proxying to backend`);
          // pageContext.json is added on client navigations to indicate we are returning just json for the client router
          // we have to remove it before proxying though.
          (req as RequestExtendedWithProxy)._proxy = {
            isPageContext: req.raw.url!.includes("/index.pageContext.json"),
            originalUrl: req.raw.url,
          };
          (req.raw as any)._proxy = true;
          req.raw.url = req.raw.url!.replace("/index.pageContext.json", "");
        }
      }
    },
    replyOptions: {
      rewriteRequestHeaders(request, headers) {
        const fwd = forwarded(request as IncomingMessage).reverse();
        // fwd.push(request.ip); TODO: not sure if this is needed
        headers["X-Forwarded-For"] = fwd.join(", ");
        headers["X-Forwarded-Host"] = host.host;
        headers["X-Forwarded-Protocol"] = host.protocol;

        if ((request as any)._proxy) {
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
          (req as RequestExtendedWithProxy)._proxy || {};
        if (isPageContext && originalUrl) {
          // restore url rewrite
          req.raw.url = originalUrl;
        }

        if ([301, 302, 303, 307, 308].includes(reply.statusCode)) {
          const location = reply.getHeader("location") as string;
          if (location) {
            const url = new URL(location);
            if (url.host === upstream.host) {
              // rewrite redirect on upstream's host to the proxy host
              url.host = host.host;
            }
            reply.header("location", url);
            if (isPageContext) {
              return reply
                .status(200)
                .type("application/json")
                .send(
                  JSON.stringify({
                    _pageId: proxyPageId,
                    redirectTo: url,
                  })
                );
            } else {
              return reply.send(res);
            }
          }
        }

        const { layout, layoutProps } = getLayout(reply);
        if (!layout) {
          return reply.send(res);
        }

        const html = await streamToString(res);

        const pageContextInit = {
          urlOriginal: req.url,
          // Nest into fromProxy to avoid triggering pageContextInitHasClientData which forces restorationVisit to refetch pageContext
          // Ideally we would just set restorationVisit onBeforeRender to no-op
          // https://github.com/brillout/vite-plugin-ssr/discussions/1075#discussioncomment-6758711
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
