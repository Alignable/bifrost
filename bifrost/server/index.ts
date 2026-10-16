/// <reference types="node" />
import type { IncomingMessage } from "node:http";
import { text } from "node:stream/consumers";
import Negotiator from "negotiator";
import { FastResponse } from "srvx";
import { parse as parseContentType } from "fast-content-type-parse";
import { getGlobalDispatcher, type Dispatcher } from "undici";
import {
  enhance,
  getAdapterRuntime,
  getUniversal,
  getUniversalProp,
  nameSymbol,
  pipeRoute,
  type RuntimeAdapterTarget,
  type UniversalHandler,
  type UniversalMiddleware,
} from "@universal-middleware/core";
import { getGlobalContext, getGlobalContextAsync, renderPage } from "vike/server";
import type { PageContextServer } from "vike/types";
import type {} from "../renderer/config";
import type { BifrostWrap, WrappedPage } from "../lib/type";
import { extractDomElements } from "./extractDomElements";
import {
  discardBody,
  forwardableRequestHeaders,
  headersToObject,
  requestUpstream,
  withoutHopByHopHeaders,
  type Upstream,
} from "./upstream";

export type RenderedPageContext = Awaited<
  ReturnType<
    typeof renderPage<
      {
        isClientSideNavigation?: boolean;
      },
      { urlOriginal: string }
    >
  >
>;

export interface BifrostOptions<Context> {
  /** Rails' URL */
  upstream: URL;
  /** The public URL. Used for X-Forwarded-* headers, and to rewrite redirects that point at Rails' host. */
  host: URL;
  /** Adds to pageContextInit. It must not set passToClient fields. It runs again before a wrapped render. */
  buildPageContextInit?: (
    request: Request,
    context: Context
  ) => Promise<Partial<Omit<PageContextServer, "headers">>>;
  /** Called when Rails returns a page to wrap, before rendering it */
  beforeWrappedRender?: (
    backend: { status: number; headers: Headers },
    context: Context
  ) => void;
  /** Called when rendering fails. Headers it adds to `pageContext.httpResponse.headers` are sent. */
  onError?: (error: unknown, pageContext: RenderedPageContext) => void;
  /** Sends the requests to Rails. Defaults to undici's global dispatcher. */
  dispatcher?: Dispatcher;
}

export interface BifrostRequestOptions<Context> {
  /** Your server's own state for the request, passed to buildPageContextInit and beforeWrappedRender */
  context?: Context;
  /** Prepended to X-Forwarded-For */
  clientAddress?: string;
  /** Aborts the request to Rails, e.g. when the client disconnects. Defaults to the request's signal. */
  signal?: AbortSignal;
  log?: BifrostLogger;
}

export interface BifrostLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface BifrostResult {
  response: Response;
  /** false when Vike rendered the page, or for a request that isn't for HTML */
  proxyMode: Vike.Config["proxyMode"];
  /** What getLayout returned for Rails' response */
  proxyLayout: Vike.ProxyLayoutInfo | null;
  /** Whether Rails was sent the route's proxyHeaders */
  sentProxyHeaders: boolean;
  /** Set when the response is Vike's */
  pageContext: RenderedPageContext | null;
  /** Set when Rails couldn't be reached. The response is this error, as Fastify's default error handler sends it. */
  upstreamError?: UpstreamError;
}

/** Why Rails couldn't be reached, with the status and code that @fastify/reply-from reported */
export class UpstreamError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string, cause: unknown) {
    super(message, { cause });
    this.name = "UpstreamError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** An element of `globalContext.middlewares` */
export type Middleware = UniversalMiddleware & { isHandler: boolean };

/** Rails' response, held back from the client while Bifrost decides whether to wrap it */
type Held =
  | { upstream: Upstream; text?: string }
  | { error: unknown }
  | { clientClosed: true };

type Diagnostics = Omit<BifrostResult, "response">;

/** What handle() passes through the middleware pipe to Bifrost's handler, and gets back */
interface RequestState<Context> extends BifrostRequestOptions<Context> {
  diagnostics?: Diagnostics;
}
const requestStateKey = Symbol("bifrost.request");

// The methods @fastify/http-proxy forwarded to Rails
const methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] as const;

const isRedirect = (statusCode: number) =>
  [301, 302, 303, 307, 308].includes(statusCode);

const defaultLog: BifrostLogger = { info() {}, warn: console.warn, error: console.error };

/**
 * Bifrost's server: Vike's handler that renders pages, wrapped so that it proxies Rails. It runs Vike's +middleware,
 * and on any server framework, since it takes a web Request and returns a Response.
 */
export function createBifrostHandler<Context = undefined>(
  options: BifrostOptions<Context>
) {
  const { upstream, host, buildPageContextInit, beforeWrappedRender, onError } =
    options;
  const dispatcher = options.dispatcher ?? getGlobalDispatcher();

  /** `globalContext.middlewares`, with Vike's handler that renders pages replaced by Bifrost's */
  function middlewares(list: readonly Middleware[]): Middleware[] {
    let replaced = false;
    const result = list.map((middleware) => {
      if (!middleware.isHandler || getUniversalProp(middleware, nameSymbol) !== "vike") {
        return middleware;
      }
      replaced = true;
      const handler = enhance(bifrostHandler(getUniversal(middleware) as UniversalHandler), {
        name: "bifrost",
        path: "/**",
        method: [...methods],
      });
      return Object.assign(handler, { isHandler: true }) as unknown as Middleware;
    });
    if (!replaced) {
      throw new Error("Bifrost didn't find Vike's page handler in globalContext.middlewares");
    }
    return result;
  }

  // The list only changes when Vike's config does
  const pipes = new WeakMap<readonly Middleware[], UniversalMiddleware>();

  /** Serves a request no route of your server took: runs Vike's +middleware, then Bifrost */
  async function handle(
    request: Request,
    requestOptions: BifrostRequestOptions<Context> = {}
  ): Promise<BifrostResult> {
    // In development, getGlobalContext() waits until an invalid config is fixed
    if (hasVikeConfigError()) return renderConfigError(request);
    const list = (await getServerGlobalContext()).middlewares as Middleware[];
    let pipe = pipes.get(list);
    if (!pipe) pipes.set(list, (pipe = pipeRoute(middlewares(list))));
    const state: RequestState<Context> = { ...requestOptions };
    const answer = await pipe(
      request,
      { [requestStateKey]: state } as Universal.Context,
      getAdapterRuntime("other", { params: undefined })
    );
    return {
      proxyMode: false,
      proxyLayout: null,
      sentProxyHeaders: false,
      pageContext: null,
      ...state.diagnostics,
      // Only a method Bifrost doesn't serve reaches no handler
      response: isResponse(answer)
        ? answer
        : createResponse("Not Found", { status: 404 }),
    };
  }

  function bifrostHandler(renderPages: UniversalHandler): UniversalHandler {
    return async (request, context, runtime) => {
      const state = (context as Record<symbol, RequestState<Context> | undefined>)[
        requestStateKey
      ];
      const diagnostics: Diagnostics = {
        proxyMode: false,
        proxyLayout: null,
        sentProxyHeaders: false,
        pageContext: null,
      };
      try {
        return await serve(request, context, runtime, state, diagnostics, renderPages);
      } finally {
        if (state) state.diagnostics = diagnostics;
      }
    };
  }

  async function serve(
    request: Request,
    context: Universal.Context,
    runtime: RuntimeAdapterTarget<unknown>,
    state: RequestState<Context> | undefined,
    diagnostics: Diagnostics,
    renderPages: UniversalHandler
  ): Promise<Response> {
    const appContext = (state ? state.context : context) as Context;
    const log = state?.log ?? defaultLog;
    const signal = state?.signal ?? request.signal;
    const clientAddress =
      state?.clientAddress ??
      (runtime as { req?: IncomingMessage }).req?.socket?.remoteAddress;
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    async function fetchUpstream(
      target: string,
      proxyHeaders?: Record<string, string>
    ): Promise<Held> {
      try {
        const response = await requestUpstream(dispatcher, {
          origin: upstream,
          path: target,
          method: request.method,
          headers: upstreamRequestHeaders(proxyHeaders),
          body: hasBody(request) ? request.body : null,
          signal,
        });
        rewriteRedirect(response);
        return { upstream: response };
      } catch (error) {
        if (signal.aborted) return { clientClosed: true };
        log.warn(`bifrost: request to backend failed: ${error}`);
        return { error };
      }
    }

    function upstreamRequestHeaders(proxyHeaders?: Record<string, string>) {
      const headers = forwardableRequestHeaders(request.headers);
      headers.host = upstream.host;
      const existingFor = request.headers.get("x-forwarded-for");
      const forwardedFor =
        existingFor && clientAddress
          ? `${clientAddress}, ${existingFor}`
          : existingFor || clientAddress;
      if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
      headers["x-forwarded-host"] = host.host;
      headers["x-forwarded-proto"] = host.protocol.replace(":", "");
      if (proxyHeaders) {
        // Proxying and wrapping
        for (const [key, val] of Object.entries(proxyHeaders)) {
          headers[key.toLowerCase()] = val;
        }
        // Rails must send the page, not a 304
        delete headers["if-modified-since"];
        delete headers["if-none-match"];
        delete headers["if-unmodified-since"];
        delete headers["if-range"];
      }
      return headers;
    }

    function rewriteRedirect(response: Upstream) {
      if (!isRedirect(response.status)) return;
      const location = response.headers.get("location");
      if (!location) return;
      const target = new URL(location, host.href);
      if (target.host === upstream.host || target.host === host.host) {
        // rewrite redirect on upstream's host to the proxy host
        target.host = host.host;
        target.protocol = host.protocol;
      }
      response.headers.set("location", target.href);
    }

    function heldResponse(held: Held): Response {
      // The client is gone. 499 is nginx's "client closed request"; an error would be logged as a server error.
      if ("clientClosed" in held) return createResponse(null, { status: 499 });
      if ("error" in held) {
        diagnostics.upstreamError = toUpstreamError(held.error);
        return errorResponse(diagnostics.upstreamError);
      }
      const { status, headers, body } = held.upstream;
      // srvx never sends a Node stream that ends without data (it waits for "readable"), so an empty body is sent as none
      const noBody =
        request.method === "HEAD" ||
        [204, 205, 304].includes(status) ||
        headers.get("content-length") === "0";
      if (noBody) discardBody(body);
      return createResponse(noBody ? null : (held.text ?? (body as unknown as BodyInit)), {
        status,
        headers: withoutHopByHopHeaders(headers),
      });
    }

    /** Vike's page. With `backend`, Rails' status and headers are merged in. */
    async function pageResponse(
      rendered: Response,
      pageContext: RenderedPageContext | null,
      backend?: { status?: number; headers: Headers }
    ): Promise<Response> {
      const errorWhileRendering = pageContext?.errorWhileRendering;
      if (onError && rendered.status === 500 && errorWhileRendering && pageContext) {
        onError(errorWhileRendering, pageContext);
      }
      // The headers Vike sent, plus any that onError added
      const httpResponse = pageContext?.httpResponse;
      const renderedHeaders =
        httpResponse?.statusCode === rendered.status
          ? httpResponse.headers
          : [...rendered.headers];
      const responseHeaders = backend
        ? withoutHopByHopHeaders(backend.headers, ["content-length"])
        : new Headers();
      for (const [name, value] of renderedHeaders) {
        if (name.toLowerCase() === "set-cookie") {
          responseHeaders.append(name, value);
        } else {
          responseHeaders.set(name, value);
        }
      }
      // If there is an error on the Bifrost side, we use the bifrost statusCode, otherwise prefer the proxy's code
      const status = errorWhileRendering
        ? rendered.status
        : (backend?.status ?? rendered.status);
      // Buffered, as bifrost-fastify always sent it. The length is set here because a +middleware's response function
      // can turn the body into a stream (Universal Middleware reads response.body), which would be sent chunked.
      const body = await rendered.text();
      responseHeaders.set("content-length", String(Buffer.byteLength(body)));
      return createResponse(body, { status, headers: responseHeaders });
    }

    if (!acceptsHtml(request)) {
      return heldResponse(await fetchUpstream(path));
    }

    const customPageContextInit =
      (await buildPageContextInit?.(request, appContext)) ?? {};

    // Filled in by loadWrappedPage, which the wrapped renderer calls during the render
    const wrapped: { held?: Held; statusCode?: number; layoutHeaders?: string[] } = {};
    let wrapping: Promise<WrappedPage | null> | undefined;

    async function loadWrappedPage(
      pageContext: PageContextServer
    ): Promise<WrappedPage | null> {
      const { getLayout, proxyHeaders = {}, layoutHeaders } = pageContext.config;
      // Client navigation and missing getLayout are handled after the render
      if (pageContext.isClientSideNavigation || !getLayout) return null;

      // If proxy headers set, this is a client navigation meant to go direct to legacy backend.
      // ALB CANNOT be used for this. see `onBeforeRenderClient` for details
      const proxyHeadersAlreadySet = Object.entries(proxyHeaders).every(
        ([key, val]) => request.headers.get(key) == val
      );
      if (proxyHeadersAlreadySet) return null;

      wrapped.layoutHeaders = layoutHeaders;
      diagnostics.sentProxyHeaders = true;
      log.info(`bifrost: proxy route matched, proxying to backend`);

      const held = await fetchUpstream(pageContext.urlParsed.href, proxyHeaders);
      wrapped.held = held;
      if (!("upstream" in held) || isRedirect(held.upstream.status)) return null;
      const backend = held.upstream;

      const proxyLayoutInfo = getLayout(headersToObject(backend.headers));
      diagnostics.proxyLayout = proxyLayoutInfo;
      if (!proxyLayoutInfo) return null;

      const contentType = backend.headers.get("content-type");
      if (!contentType || parseContentType(contentType).type !== "text/html") {
        return null;
      }

      const html = await text(backend.body);
      const { bodyAttributes, bodyInnerHtml, headInnerHtml } =
        extractDomElements(html);
      if (!bodyInnerHtml || !headInnerHtml) {
        wrapped.held = { upstream: backend, text: html };
        return null;
      }

      try {
        beforeWrappedRender?.(backend, appContext);
      } catch (e) {
        log.error(`Error in beforeWrappedRender: ${(e as Error).message}`);
      }
      // beforeWrappedRender may have changed the request state (e.g. a session set by the backend)
      const customPageContextInit =
        (await buildPageContextInit?.(request, appContext)) ?? {};

      wrapped.statusCode = backend.status;
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

    const bifrostWrap: BifrostWrap = {
      // Memoized: an app's +onCreatePageContext may call it too, and Bifrost may render again (see loadWrappedPage)
      load: (pageContext) => (wrapping ??= loadWrappedPage(pageContext)),
    };
    const { [requestStateKey]: _, ...middlewareContext } = context as Record<
      string | symbol,
      unknown
    >;
    // Vike's handler adds the context to pageContextInit
    const rendered = await renderPages(
      request,
      {
        ...middlewareContext,
        urlOriginal: path,
        headersOriginal: Object.fromEntries(request.headers),
        // Critical that we don't set any passToClient values in pageContextInit
        // If we do, Vike re-requests pageContext on client navigation. This breaks wrapped proxy.
        _bifrostWrap: bifrostWrap,
        ...customPageContextInit,
      } as Universal.Context,
      runtime
    );
    // Vike's handler returns a Response; its pageContext is the one bifrost's +onHookCall last saw
    const pageContext = (bifrostWrap.pageContext ?? null) as RenderedPageContext | null;

    // A hook ran after the backend responded and threw redirect(), e.g. a +guard on the wrapped route
    const redirected = isRedirect(rendered.status);
    // Layout headers are for getLayout only
    const backendHeaders = (held: Held) =>
      "upstream" in held
        ? withoutHopByHopHeaders(held.upstream.headers, wrapped.layoutHeaders)
        : new Headers();

    if (wrapped.statusCode !== undefined && !redirected && wrapped.held) {
      diagnostics.pageContext = pageContext;
      diagnostics.proxyMode = "wrapped";
      // Preserve the upstream's status code (e.g. 404) rather than using Vike's
      return pageResponse(rendered, pageContext, {
        status: wrapped.statusCode,
        headers: backendHeaders(wrapped.held),
      });
    }

    if (wrapped.held) {
      const { held } = wrapped;
      diagnostics.proxyMode = "wrapped";
      // Send Vike's redirect, or its error page when wrapping failed (e.g. getLayout threw) rather than the backend's page without its layout
      if (!("clientClosed" in held) && (pageContext?.errorWhileRendering || redirected)) {
        if ("upstream" in held && held.text === undefined) {
          discardBody(held.upstream.body);
        }
        diagnostics.pageContext = pageContext;
        return pageResponse(rendered, pageContext, { headers: backendHeaders(held) });
      }
      // The backend already responded but isn't wrappable: send it as-is
      if (!("clientClosed" in held)) diagnostics.proxyMode = "passthru";
      await rendered.body?.cancel();
      return heldResponse(held);
    }

    const proxyMode = pageContext?.config?.proxyMode;
    if (!proxyMode) {
      diagnostics.pageContext = pageContext;
      log.info(`bifrost: rendering page ${pageContext?.pageId}`);
      return pageResponse(rendered, pageContext);
    }

    await rendered.body?.cancel();
    diagnostics.proxyMode = "passthru";
    switch (proxyMode) {
      case "passthru": {
        log.info(`bifrost: passthru proxy to backend`);
        break;
      }
      case "wrapped": {
        if (pageContext?.isClientSideNavigation) {
          // This should never happen because wrapped proxy routes have no onBeforeRender. onRenderClient should make a request to the legacy backend.
          log.error(
            "Wrapped proxy route is requesting index.pageContext.json. Something is wrong with the client."
          );
          return createResponse(null, {
            status: 302,
            headers: { location: path.replace("/index.pageContext.json", "") },
          });
        }
        if (!pageContext?.config?.getLayout) {
          log.error(
            "Config missing getLayout on wrapped route! Falling back to passthru proxy"
          );
        }
        break;
      }
    }
    return heldResponse(await fetchUpstream(pageContext?.urlParsed?.href ?? path));
  }

  return { handle, middlewares };
}

// Vike's state, read where Vike's own middleware pipe and renderPage() call getVikeConfigError(), which isn't public
function hasVikeConfigError() {
  const state = (
    globalThis as {
      _vike?: { globals?: Record<string, { errorBuild?: unknown; errorRuntime?: unknown } | undefined> };
    }
  )._vike?.globals?.["server/shared/getVikeConfigError.ts"];
  return !!(state?.errorBuild || state?.errorRuntime);
}

/** Vike's page for an invalid config: renderPage() renders it without running +middleware */
async function renderConfigError(request: Request): Promise<BifrostResult> {
  const url = new URL(request.url);
  const pageContext = await renderPage({
    urlOriginal: url.pathname + url.search,
    headersOriginal: Object.fromEntries(request.headers),
  });
  const { statusCode, headers, getBody } = pageContext.httpResponse!;
  return {
    proxyMode: false,
    proxyLayout: null,
    sentProxyHeaders: false,
    pageContext,
    response: createResponse(await getBody(), { status: statusCode, headers }),
  };
}

async function getServerGlobalContext() {
  let globalContext;
  try {
    globalContext = await getGlobalContext();
  } catch {
    // Vike knows whether it runs in production once its development server or production build is loaded. Before
    // that, e.g. on a server's first request, it needs to be told.
    globalContext = await getGlobalContextAsync(process.env.NODE_ENV === "production");
  }
  if (globalContext.isClientSide) throw new Error("Bifrost's server runs on the server");
  return globalContext;
}

// srvx's FastResponse keeps a Node stream or string body as is, for srvx and bifrost-fastify to send without a web
// stream. It extends the Response class of when srvx loaded, so it isn't one once a server replaces
// globalThis.Response (as @hono/node-server does), and middleware pipes, which check instanceof Response, would
// take it for a context.
function createResponse(body: BodyInit | null, init: ResponseInit): Response {
  const response = new FastResponse(body, init);
  return response instanceof Response ? response : new Response(body, init);
}

function isResponse(value: unknown): value is Response {
  return (
    value instanceof Response ||
    typeof (value as { _toNodeResponse?: unknown } | undefined)?._toNodeResponse === "function"
  );
}

function acceptsHtml(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const accept = request.headers.get("accept") ?? undefined;
  return new Negotiator({ headers: { accept } }).mediaTypes(["text/html"]).length > 0;
}

// The statuses and errors @fastify/reply-from answered with, as Fastify serialized them
const upstreamErrors: Record<string, [status: number, code: string, message: string]> = {
  ENOTFOUND: [503, "FST_REPLY_FROM_SERVICE_UNAVAILABLE", "Service Unavailable"],
  UND_ERR_HEADERS_TIMEOUT: [504, "FST_REPLY_FROM_GATEWAY_TIMEOUT", "Gateway Timeout"],
  ECONNRESET: [500, "ECONNRESET", "Connection Reset"],
  UND_ERR_SOCKET: [500, "UND_ERR_SOCKET", "Undici Socket Error"],
  UND_ERR_CONNECT_TIMEOUT: [500, "UND_ERR_CONNECT_TIMEOUT", "Connect Timeout Error"],
};
const statusTexts: Record<number, string> = {
  500: "Internal Server Error",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

function toUpstreamError(error: unknown): UpstreamError {
  const [status, code, message] = upstreamErrors[(error as { code?: string } | null)?.code ?? ""] ?? [
    500,
    "FST_REPLY_FROM_INTERNAL_SERVER_ERROR",
    String((error as Error)?.message),
  ];
  return new UpstreamError(status, code, message, error);
}

function errorResponse({ statusCode, code, message }: UpstreamError): Response {
  const body = JSON.stringify({ statusCode, code, error: statusTexts[statusCode], message });
  return createResponse(body, {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(Buffer.byteLength(body)),
    },
  });
}

function hasBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return false;
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) return Number(contentLength) > 0;
  return request.headers.has("transfer-encoding");
}
