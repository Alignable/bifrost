// Note that this file isn't processed by Vite, see https://github.com/brillout/vite-plugin-ssr/issues/562
import compress from "@fastify/compress";
import middie from "@fastify/middie";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { viteProxyPlugin } from "@alignable/bifrost-fastify";
import { LayoutProps } from "../layouts/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const root = `${__dirname}/..`;

startServer();
const UPSTREAM = new URL("http://localhost:5557"); //new URL("http://dev.alignable.com:3000");
const HOST = new URL("http://localhost:5555");

async function startServer() {
  const app = fastify();

  await app.register(middie);
  await app.register(compress);

  if (isProduction) {
    console.log("prod");
    const distPath = path.join(root, "/dist/client/assets");
    app.register(fastifyStatic, {
      root: distPath,
      prefix: "/assets/",
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

  app.register(viteProxyPlugin, {
    upstream: UPSTREAM,
    host: HOST,
    rewriteRequestHeaders(req, headers) {
      headers['X-VITE-PROXY'] = "1"; // Signal to legacy backend we're coming from proxy
      return headers;
    },
    getLayout(reply) {
      return {
        layout: reply.getHeader("X-REACT-LAYOUT") as string,
        layoutProps: {
          currentNav: reply.getHeader("X-REACT-CURRENT-NAV") as string,
        } satisfies LayoutProps,
      };
    },
  });

  const port: number = process.env.PORT ? +process.env.PORT : 5555;

  app.listen({ port });

  console.log(`Server running at http://localhost:${port}`);
}
