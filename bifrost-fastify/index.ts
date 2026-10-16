import type {
  FastifyContentTypeParser,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Readable } from "node:stream";
import { Agent } from "undici";
import {
  createBifrostHandler,
  type RenderedPageContext,
} from "@alignable/bifrost/server";
import type { PageContextServer } from "vike/types";

declare module "fastify" {
  interface FastifyRequest {
    /// Actual ProxyMode after processing  backend server results, which can tell us to fallback to passthru or redirect
    bifrostProxyMode?: Vike.Config["proxyMode"];
    /// whether we sent proxy headers to legacy backend
    bifrostSentProxyHeaders?: boolean;
    bifrostProxyLayout?: Vike.ProxyLayoutInfo | null;
    /// Only set when proxy mode is false or wrapped
    vikePageContext?: Partial<PageContextServer> | null;
  }
}

interface ViteProxyPluginOptions {
  upstream: URL;
  host: URL;
  onError?: (error: any, pageContext: RenderedPageContext) => void;
  buildPageContextInit?: (
    req: FastifyRequest
  ) => Promise<Partial<Omit<PageContextServer, "headers">>>;
  /** `reply` holds the backend's response headers */
  beforeWrappedRender?: (
    req: FastifyRequest,
    reply: Pick<FastifyReply, "getHeader" | "getHeaders">
  ) => void;
  /** Request the backend through undici's global dispatcher instead of the plugin's own */
  globalAgent?: boolean;
}

/**
 * Fastify plugin that mounts Bifrost's server as a catch-all route: Vike renders pages and the rest goes to Rails.
 * Vike's +middleware run for the requests that reach it, not for your other routes.
 */
export const viteProxyPlugin: FastifyPluginAsync<
  ViteProxyPluginOptions
> = async (fastify, opts) => {
  const { buildPageContextInit, beforeWrappedRender } = opts;
  // The connection limit @fastify/reply-from's agent had
  const dispatcher = opts.globalAgent ? undefined : new Agent({ connections: 128 });
  fastify.addHook("onClose", async () => dispatcher?.close());

  const bifrost = createBifrostHandler<FastifyRequest>({
    upstream: opts.upstream,
    host: opts.host,
    dispatcher,
    onError: opts.onError,
    buildPageContextInit:
      buildPageContextInit && ((_request, req) => buildPageContextInit(req)),
    beforeWrappedRender:
      beforeWrappedRender &&
      ((backend, req) => beforeWrappedRender(req, headersReply(backend.headers))),
  });

  // Rails gets request bodies as they arrived, as it did through @fastify/http-proxy
  fastify.addContentTypeParser("application/json", passBodyThrough);
  fastify.addContentTypeParser("*", passBodyThrough);

  fastify.decorateRequest("bifrostProxyMode", false);
  fastify.decorateRequest("bifrostProxyLayout", null);
  fastify.decorateRequest("bifrostSentProxyHeaders", false);
  fastify.decorateRequest("vikePageContext", null);

  async function handler(req: FastifyRequest, reply: FastifyReply) {
    const clientGone = new AbortController();
    reply.raw.once("close", () => {
      if (!reply.raw.writableFinished) clientGone.abort();
    });
    const { response, upstreamError, ...result } = await bifrost.handle(toRequest(req), {
      context: req,
      clientAddress: req.raw.socket?.remoteAddress,
      signal: clientGone.signal,
      log: req.log,
    });
    req.bifrostProxyMode = result.proxyMode;
    req.bifrostProxyLayout = result.proxyLayout;
    req.bifrostSentProxyHeaders = result.sentProxyHeaders;
    req.vikePageContext = result.pageContext;
    // To your error handler, as @fastify/reply-from sent it
    if (upstreamError) return reply.send(upstreamError);
    // On the reply rather than in the Response, so that onSend hooks see them
    const { status, headers, body } = toNodeResponse(response);
    reply.code(status);
    for (let i = 0; i < headers.length; i += 2) reply.header(headers[i], headers[i + 1]);
    return reply.send(body ?? undefined);
  }
  // The methods @fastify/http-proxy forwarded
  const method = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
  fastify.route({ method, url: "/", handler });
  fastify.route({ method, url: "/*", handler });
};

const passBodyThrough: FastifyContentTypeParser = (_req, payload, done) =>
  done(null, payload);

function toRequest(req: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    // HTTP/2 pseudo-headers
    if (name.startsWith(":") || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, item);
    }
  }
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? null
      : Readable.toWeb(req.body instanceof Readable ? req.body : req.raw);
  return new Request(new URL(req.url, `${req.protocol}://${req.host}`), {
    method: req.method,
    headers,
    body: body as ReadableStream<Uint8Array> | null,
    duplex: "half",
  } as RequestInit);
}

type NodeResponse = { status: number; headers: string[]; body: unknown };

/** Bifrost's responses are srvx FastResponses, whose Node stream or string body Fastify can send without converting it to a web stream */
function toNodeResponse(response: Response): NodeResponse {
  const fast = response as Response & { _toNodeResponse?: () => NodeResponse };
  if (fast._toNodeResponse) return fast._toNodeResponse();
  const headers: string[] = [];
  for (const [name, value] of response.headers) headers.push(name, value);
  return { status: response.status, headers, body: response.body };
}

/** The reply that beforeWrappedRender reads the backend's headers from */
function headersReply(
  headers: Headers
): Pick<FastifyReply, "getHeader" | "getHeaders"> {
  const object: Record<string, string | string[]> = Object.fromEntries(headers);
  const setCookie = headers.getSetCookie();
  if (setCookie.length) object["set-cookie"] = setCookie;
  return {
    getHeader: (name: string) => object[name.toLowerCase()],
    getHeaders: () => object,
  } as Pick<FastifyReply, "getHeader" | "getHeaders">;
}
