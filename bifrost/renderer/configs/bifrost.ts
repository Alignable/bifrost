import { Config } from "vike/types";

const passToClient = [
  "layoutProps",
  "pageProps",
  "redirectTo",
  "bodyAttrs",
  "documentProps",
  "scripts",
  "is404",
];
export const bifrostConfig = {
  passToClient,
  meta: {
    Layout: { env: { server: true, client: true } },
    layoutProps: { env: { server: true, client: true } },
    documentProps: { env: { server: true, client: true } },
    bodyAttrs: { env: { server: true, client: true } },
    scripts: {
      env: { server: true, client: true },
      cumulative: true,
    },
    favicon: { env: { server: true } },
  },
} satisfies Config;
