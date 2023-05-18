import { Config } from "vite-plugin-ssr/types";
import onBeforeRender from "terabithia/proxy/pages/+onBeforeRender";
import onRenderClient from "terabithia/proxy/pages/+onRenderClient";
import onRenderHtml from "terabithia/proxy/pages/+onRenderHtml";
import Page from "terabithia/proxy/pages/+Page";

export default {
  route: "/*",
  onBeforeRender,
  onRenderClient,
  onRenderHtml,
  Page,
  passToClient: ["proxySendClient", "layout", "layoutProps", "redirectTo"],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    layoutMap: { env: "server-and-client" },
  },
} satisfies Config;
