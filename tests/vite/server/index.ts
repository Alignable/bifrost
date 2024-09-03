// Note that this file isn't processed by Vite, see https://github.com/brillout/vike/issues/562
import compress from "@fastify/compress";
import middie from "@fastify/middie";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { viteProxyPlugin } from "@alignable/bifrost-fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const root = `${__dirname}/..`;

startServer();
const UPSTREAM = new URL("http://localhost:5557"); //new URL("http://dev.alignable.com:3000");
const HOST = new URL("http://localhost:5050");

async function startServer() {
  const app = fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

  await app.register(middie);
  await app.register(compress);

  if (isProduction) {
    console.log("Running in production mode");
    const distPath = path.join(root, "/vite/client/assets");
    app.register(fastifyStatic, {
      root: distPath,
      prefix: "/bifrost-assets/assets/",
    });
  } else {
    const vite = await import("vite");
    // hack to force vite to regenerate dependency cache. optimizeDeps.exclude doesnt work due to VPS
    await fs.rm("node_modules/.vite", { recursive: true, force: true });

    const viteServer = await vite.createServer({
      root,
      server: { middlewareMode: true },
    });
    await app.use(viteServer.middlewares);
  }

  app.addHook("onSend", async (req, reply) => {
    if (req.bifrostPageId) {
      // set header for testing
      reply.header("X-TEST-PAGEID", req.bifrostPageId);
    }
  });

  app.register(viteProxyPlugin, {
    upstream: UPSTREAM,
    host: HOST,
    async buildPageContextInit(req) {
      // hit auth server etc.
      return { loggedIn: true };
    },
    onError(e, pageContext) {
      if (pageContext.httpResponse) {
        pageContext.httpResponse.headers.push(["X-TEST-ONERROR", "true"]);
      }
    },
  });

  const port: number = process.env.PORT ? +process.env.PORT : 5555;

  app.listen({ port });

  console.log(`Server running at http://localhost:${port}`);
}
