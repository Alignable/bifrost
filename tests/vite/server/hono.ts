// The test server on Hono instead of Fastify: Bifrost's server is the same createBifrostHandler()
import { Hono } from "hono";
import { getRequestListener, serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { serveStatic } from "@hono/node-server/serve-static";
import { createServer } from "node:http";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { bifrost, corsTestHeaders, corsTestHtml, setTestHeaders } from "./bifrost.js";

const isProduction = process.env.NODE_ENV === "production";
const root = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.PORT ? +process.env.PORT : 5555;

const app = new Hono();

if (isProduction) {
  app.use(
    "/bifrost-assets/assets/*",
    serveStatic({
      root: `${root}/vite/client/assets`,
      rewriteRequestPath: (path) => path.replace("/bifrost-assets/assets", ""),
    })
  );
}

app.get("/cors-test", (c) => c.html(corsTestHtml, 200, corsTestHeaders));

// Last, so that the routes above win
app.all("*", async (c) => {
  const result = await bifrost.handle(c.req.raw, {
    clientAddress: getConnInfo(c).remote.address,
  });
  setTestHeaders(result);
  return result.response;
});

startServer();

async function startServer() {
  if (isProduction) {
    serve({ fetch: app.fetch, port });
  } else {
    await fs.rm("node_modules/.vite", { recursive: true, force: true });
    const { createDevMiddleware } = await import("vike/server");
    const { devMiddleware } = await createDevMiddleware({ root });
    // Vite's middleware is Connect-style, so it goes in front of Hono on the Node server
    const hono = getRequestListener(app.fetch);
    createServer((req, res) => devMiddleware(req, res, () => hono(req, res))).listen(
      port
    );
  }
  console.log(`Hono server running at http://localhost:${port}`);
}
