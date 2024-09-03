import { Config } from "vike/types";

export const wrappedConfig = {
  passToClient: ["layout", "layoutProps", "redirectTo"],
  meta: {
    layoutMap: { env: { server: true, client: true } },
    getLayout: { env: { server: true, client: true } },
    proxyHeaders: { env: { server: true, client: true } },
  },
} satisfies Config;
