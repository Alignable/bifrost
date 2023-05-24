import { Config } from "vite-plugin-ssr/types";
import onRenderClient from "terabithia/renderer/onRenderClient";
import onRenderHtml from "terabithia/renderer/onRenderHtml";
import onBeforeRoute from "terabithia/renderer/onBeforeRoute";

export default {
  passToClient: [
    "layoutProps", "pageProps", "redirectTo", "documentProps",
  ],
  onRenderClient,
  onRenderHtml,
  onBeforeRoute,
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: "server-and-client" },
    layoutProps: {env: "server-and-client"},
    documentProps: { env: "server-and-client" },
  },
} satisfies Config;
