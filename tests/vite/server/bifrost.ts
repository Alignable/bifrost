// Bifrost for the fetch-based test servers (hono.ts, srvx.ts): the same setup as index.ts gives viteProxyPlugin
import {
  createBifrostHandler,
  type BifrostResult,
} from "@alignable/bifrost/server";

export const bifrost = createBifrostHandler({
  upstream: new URL(process.env.UPSTREAM_URL || "http://localhost:5557"),
  host: new URL(process.env.PUBLIC_URL || "http://localhost:5050"),
  async buildPageContextInit(request) {
    // hit auth server etc.
    return { loggedIn: !!new URL(request.url).searchParams.get("loggedIn") };
  },
  onError(_error, pageContext) {
    if (pageContext.httpResponse) {
      pageContext.httpResponse.headers.push(["X-TEST-ONERROR", "true"]);
    }
  },
});

/** The diagnostics index.ts reads off its Fastify request */
export function setTestHeaders(result: BifrostResult) {
  const { headers } = result.response;
  if (result.pageContext?.pageId) {
    headers.set("X-TEST-PAGEID", result.pageContext.pageId);
  }
  const layoutInfo = Object.keys(result.proxyLayout || {}).join(",");
  if (layoutInfo) headers.set("X-TEST-LAYOUT", layoutInfo);
  if (result.proxyMode !== undefined) {
    headers.set("X-TEST-PROXYMODE", JSON.stringify(result.proxyMode));
  }
  headers.set("X-TEST-SENT-PROXY-HEADERS", result.sentProxyHeaders ? "1" : "0");
  if (result.pageContext?.pageContextsAborted) {
    headers.set(
      "X-TEST-ABORTS",
      String(result.pageContext.pageContextsAborted.length)
    );
  }
  const fromMiddleware = result.pageContext?.fromMiddleware;
  if (fromMiddleware) headers.set("X-TEST-MIDDLEWARE-CONTEXT", fromMiddleware);
  const appHookSawWrappedPage = result.pageContext?.appHookSawWrappedPage;
  if (appHookSawWrappedPage !== undefined) {
    headers.set("X-TEST-APP-HOOK-SAW-WRAPPED", String(appHookSawWrappedPage));
  }
  // index.ts's error handler sets it
  if (result.upstreamError) {
    headers.set("X-TEST-ERROR-CODE", result.upstreamError.code);
  }
}

export const corsTestHtml =
  "<html><head><title>external</title></head><body>CORS test page from Vite server</body></html>";
export const corsTestHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5555",
  "Access-Control-Allow-Credentials": "true",
};
