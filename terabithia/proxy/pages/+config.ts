import { Config } from "vite-plugin-ssr/types";

export default {
  route: "/*",
  passToClient: ["proxySendClient", "layout", "layoutProps", "redirectTo"],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    layoutMap: { env: "server-and-client" },
  },
} satisfies Config;
