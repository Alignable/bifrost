// The test server with no framework: srvx in production, a plain node:http server in development
import type { ServerRequest } from "srvx";
import { serve, toNodeHandler } from "srvx/node";
import { staticMiddleware } from "srvx/static";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { bifrost, corsTestHeaders, corsTestHtml, setTestHeaders } from "./bifrost.js";

const isProduction = process.env.NODE_ENV === "production";
const root = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.PORT ? +process.env.PORT : 5555;
const assetsPrefix = "/bifrost-assets/assets";
const assets = staticMiddleware({ dir: `${root}/vite/client/assets` });

async function fetch(request: ServerRequest): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/cors-test") {
    return new Response(corsTestHtml, {
      headers: { "content-type": "text/html; charset=utf-8", ...corsTestHeaders },
    });
  }
  if (isProduction && url.pathname.startsWith(`${assetsPrefix}/`)) {
    // staticMiddleware serves the URL's whole path from its dir
    url.pathname = url.pathname.slice(assetsPrefix.length);
    return assets(new Request(url, request) as ServerRequest, () =>
      new Response("Not Found", { status: 404 })
    );
  }
  const result = await bifrost.handle(request, { clientAddress: request.ip });
  setTestHeaders(result);
  return result.response;
}

startServer();

async function startServer() {
  if (isProduction) {
    // srvx's graceful shutdown closes the server on SIGTERM but doesn't exit, and open keep-alive sockets keep the process up
    serve({ fetch, port, silent: true, gracefulShutdown: false });
  } else {
    await fs.rm("node_modules/.vite", { recursive: true, force: true });
    const { createDevMiddleware } = await import("vike/server");
    const { devMiddleware } = await createDevMiddleware({ root });
    // serve() is node:http plus toNodeHandler(); a server of your own can add Vite's Connect-style middleware in front
    const handler = toNodeHandler(fetch) as (req: IncomingMessage, res: ServerResponse) => void;
    createServer((req, res) => devMiddleware(req, res, () => handler(req, res))).listen(
      port
    );
  }
  console.log(`srvx server running at http://localhost:${port}`);
}
