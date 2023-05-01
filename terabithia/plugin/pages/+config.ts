import { Config } from "vite-plugin-ssr/types";

export default {
  passToClient: [
    ...["layoutProps", "pageProps", "redirectTo", "documentProps"],
    // ...["proxySendClient", "layout", "layoutProps", "redirectTo"], // tmp adding stuff from proxy
  ],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: "server-and-client" },
    documentProps: { env: "server-and-client" },
  },
} satisfies Config;
