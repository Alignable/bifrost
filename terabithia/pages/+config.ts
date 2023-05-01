import { Config } from "vite-plugin-ssr/types";

export default {
  passToClient: [
    ...["layoutProps", "pageProps", "redirectTo", "documentProps"],
  ],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: "server-and-client" },
    layoutProps: {env: "server-and-client"},
    documentProps: { env: "server-and-client" },
  },
} satisfies Config;
