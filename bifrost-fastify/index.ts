// Note that this file isn't processed by Vite, see https://github.com/brillout/vite-plugin-ssr/issues/562
import { FastifyReply, RawServerBase, FastifyPluginAsync } from "fastify";
import { FastifyRequest, RequestGenericInterface } from "fastify/types/request";
import proxy from "@fastify/http-proxy";
import accepts from "@fastify/accepts";
import { type PageContextProxy } from "../bifrost/types/internal.js";
import forwarded from "@fastify/forwarded";
import { Writable } from "stream";
import { IncomingHttpHeaders, IncomingMessage } from "http";
import {
  Http2ServerRequest,
  IncomingHttpHeaders as Http2IncomingHttpHeaders,
} from "http2";
import { renderPage } from "vite-plugin-ssr/server";

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
  pageContext: Awaited<ReturnType<typeof renderPage>>
): Promise<FastifyReply> {
  const { httpResponse } = pageContext;

  if (!httpResponse) {
    return reply.code(404).type("text/html").send("Not Found");
  }

  const { body, statusCode, contentType } = httpResponse;

  return reply.status(statusCode).type(contentType).send(body);
}

const proxyPageId = "/proxy/pages";

interface ViteProxyPluginOptions {
  upstream: URL;
  host: URL;
  getLayout: (reply: FastifyReply<RawServerBase>) => {
    layout: string;
    layoutProps: any;
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
> = async (fastify, { upstream, host, rewriteRequestHeaders, getLayout }) => {
  await fastify.register(accepts);
  await fastify.register(proxy, {
    upstream: upstream.href,
    async preHandler(req, reply) {
      if (req.method === "GET" && req.accepts().type(["html"]) === "html") {
        const pageContextInit = {
          urlOriginal: req.url,
        };

        const pageContext = await renderPage<
          { _pageId: string },
          typeof pageContextInit
        >(pageContextInit);

        const proxy = pageContext._pageId === proxyPageId;

        if (!proxy) {
          return replyWithPage(reply, pageContext);
        } else {
          // pageContext.json is added on client navigations to indicate we are returning just json for the client router
          // we have to remove it before proxying though.
          (req as RequestExtendedWithProxy)._proxy = {
            isPageContext: req.raw.url!.includes("/index.pageContext.json"),
            originalUrl: req.raw.url,
          };
          req.raw.url = req.raw.url!.replace("/index.pageContext.json", "");
        }
      }
    },
    replyOptions: {
      rewriteRequestHeaders(request, headers) {
        // Delete cache headers
        delete headers["if-modified-since"];
        delete headers["if-none-match"];
        delete headers["if-unmodified-since"];
        delete headers["if-none-match"];
        delete headers["if-range"];

        const fwd = forwarded(request as IncomingMessage).reverse();
        // fwd.push(request.ip); TODO: not sure if this is needed
        headers["X-Forwarded-For"] = fwd.join(", ");
        headers["X-Forwarded-Host"] = host.host;
        headers["X-Forwarded-Protocol"] = host.protocol;
        if (rewriteRequestHeaders) {
          return rewriteRequestHeaders(request, headers);
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
              reply
                .status(200)
                .type("application/json")
                .send(
                  JSON.stringify({
                    pageContext: {
                      // A bit hacky, but we manually construct the VPS pageContext here
                      _pageId: proxyPageId,
                      redirectTo: url,
                    },
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

        const proxy = await streamToString(res);
        // if (!bodyEl || !head) {
        //   return reply.code(404).type("text/html").send("proxy failed");
        // }

        const pageContextInit: Partial<PageContextProxy> = {
          urlOriginal: req.url,
          layout,
          layoutProps,
        };
        if (isPageContext) {
          //  roxySendClient is serialized and sent to client on subsequent navigation.
          Object.assign(pageContextInit, { proxySendClient: proxy });
        } else {
          // proxy is ONLY included server-side to avoid doubling page size
          Object.assign(pageContextInit, { proxy });
        }
        const pageContext = await renderPage(pageContextInit);
        return replyWithPage(reply, pageContext);
      },
    },
  });
};
