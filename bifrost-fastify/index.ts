// Note that this file isn't processed by Vite, see https://github.com/brillout/vike/issues/562
import { FastifyReply, RawServerBase, FastifyPluginAsync } from "fastify";
import { FastifyRequest, RequestGenericInterface } from "fastify/types/request";
import proxy from "@fastify/http-proxy";
import accepts from "@fastify/accepts";
import forwarded from "@fastify/forwarded";
import { Writable } from "stream";
import { IncomingMessage } from "http";
import { renderPage } from "vike/server";
import { AugmentMe, GetLayout, PageContext } from "@alignable/bifrost";
import jsdom from "jsdom";

type RenderedPageContext = Awaited<
  ReturnType<
    typeof renderPage<
      {
        redirectTo?: string;
        isClientSideNavigation?: boolean;
      },
      { urlOriginal: string }
    >
  >
>;

declare module "fastify" {
  interface FastifyRequest {
    bifrostPageId?: string | null;
    getLayout: GetLayout;
    layoutMap?: Record<string, React.ComponentType<any>>;
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
}
/**
 * Fastify plugin that wraps @fasitfy/http-proxy to proxy Rails/Turbolinks server into a vike site.
 */
export const viteProxyPlugin: FastifyPluginAsync<
  ViteProxyPluginOptions
> = async (fastify, { upstream, host, onError, buildPageContextInit }) => {
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
  fastify.decorateRequest("getLayout", null);
  fastify.decorateRequest("layoutMap", null);
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
          PageContext,
          typeof pageContextInit
        >(pageContextInit);

        // this does not handle getting the original pageId when errors are thrown: https://github.com/vikejs/vike/issues/1112
        req.bifrostPageId = pageContext.pageId;

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
            // Use passthru proxy in this case. In prod, it'd be better to use ALB to flip target
            if (proxyHeadersAlreadySet) return;

            (req.raw as RawRequestExtendedWithProxy)._bfproxy = true;
            req.getLayout = pageContext.config.getLayout;
            req.layoutMap = pageContext.config.layoutMap;
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

        const layoutInfo = req.getLayout?.(reply.getHeaders());
        if (!req.layoutMap?.[layoutInfo?.layout]) {
          return reply.send(res);
        }

        const html = await streamToString(res);

        const dom = new jsdom.JSDOM(html);
        const doc = dom.window.document;
        const body = doc.querySelector("body");
        const head = doc.querySelector("head");
        if (!body || !head) {
          throw new Error("Proxy failed");
        }
        const pageContextInit = {
          urlOriginal: req.url,
          // Critical that we don't set any passToClient values in pageContextInit
          // If we do, Vike re-requests pageContext on client navigation. This breaks wrapped proxy.
          wrappedServerOnly: {
            body,
            head,
            layout: layoutInfo.layout,
            layoutProps: layoutInfo.layoutProps,
          },
        };
        const pageContext = await renderPage(pageContextInit);
        return replyWithPage(reply, pageContext);
      },
    },
  });
};
