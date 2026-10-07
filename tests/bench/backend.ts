// Stand-in for Rails: serves pre-rendered fixtures with minimal overhead so benchmarks measure Bifrost, not the backend.
import { createServer, type OutgoingHttpHeaders } from "node:http";
import { randomUUID } from "node:crypto";
import { SIGN_IN_LAYOUT_HEADERS, signInHtml } from "./fixtures/signIn";
import { businessProfileHtml } from "./fixtures/businessProfile";

const signIn = Buffer.from(signInHtml());
const businessProfile = Buffer.from(businessProfileHtml());
const script = Buffer.from("window.benchAssetsLoaded = (window.benchAssetsLoaded || 0) + 1;");
const stylesheet = Buffer.from("body { margin: 0; }");

const RAILS_HEADERS: OutgoingHttpHeaders = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-frame-options": "SAMEORIGIN",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  vary: "Accept, Origin",
};

/** `latencyMs` delays page responses (not assets) to simulate Rails render time. */
export function startBackend(port: number, latencyMs = 0) {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url!, "http://backend");
    let send = (status: number, headers: OutgoingHttpHeaders, body: Buffer) => {
      res.writeHead(status, { ...headers, "content-length": body.length });
      res.end(body);
    };
    if (latencyMs && pathname.startsWith("/bench/")) {
      const respond = send;
      send = (...args) => void setTimeout(() => respond(...args), latencyMs);
    }
    if (pathname.startsWith("/assets/")) {
      const isCss = pathname.endsWith(".css");
      return send(200, { "content-type": isCss ? "text/css" : "application/javascript", "cache-control": "public, max-age=31536000" }, isCss ? stylesheet : script);
    }
    const headers: OutgoingHttpHeaders = {
      ...RAILS_HEADERS,
      "x-request-id": randomUUID(),
      "set-cookie": `_bench_session=${randomUUID()}; path=/; HttpOnly; SameSite=Lax`,
    };
    if (pathname.startsWith("/bench/business")) {
      // No layout header: Bifrost falls back to passthru, like Rails pages that aren't wrapped yet.
      return send(200, headers, businessProfile);
    }
    if (pathname.startsWith("/bench/")) {
      if (req.headers["x-vite-proxy"]) Object.assign(headers, SIGN_IN_LAYOUT_HEADERS);
      return send(200, headers, signIn);
    }
    send(404, { "content-type": "text/plain" }, Buffer.from("not found"));
  });
  server.keepAliveTimeout = 60_000;
  return new Promise<typeof server>((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 5657);
  await startBackend(port, Number(process.env.BACKEND_LATENCY_MS || 0));
  console.log(`bench backend listening on http://localhost:${port}`);
}
