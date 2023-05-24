import { Config } from "vite-plugin-ssr/types";
import onBeforeRender from "@alignable/bifrost/proxy/pages/onBeforeRender";
import onRenderClient from "@alignable/bifrost/proxy/pages/onRenderClient";
import onRenderHtml from "@alignable/bifrost/proxy/pages/onRenderHtml";
import Page from "@alignable/bifrost/proxy/pages/Page";

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
