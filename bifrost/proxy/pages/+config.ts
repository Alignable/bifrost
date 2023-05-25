import { type ConfigNonHeaderFile } from "vite-plugin-ssr/types";

export default {
  route: "/*",
  onBeforeRenderPath: "@alignable/bifrost/proxy/pages/onBeforeRender",
  onRenderClientPath: "@alignable/bifrost/proxy/pages/onRenderClient",
  onRenderHtmlPath: "@alignable/bifrost/proxy/pages/onRenderHtml",
  PagePath: "@alignable/bifrost/proxy/pages/Page",
  passToClient: ["proxySendClient", "layout", "layoutProps", "redirectTo"],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    layoutMap: { env: "server-and-client" },
  },
} satisfies ConfigNonHeaderFile;
