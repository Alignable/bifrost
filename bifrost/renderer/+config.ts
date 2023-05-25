import { type ConfigNonHeaderFile } from "vite-plugin-ssr/types";

export default {
  passToClient: ["layoutProps", "pageProps", "redirectTo", "documentProps"],
  onRenderClientPath: "@alignable/bifrost/renderer/onRenderClient",
  onRenderHtmlPath: "@alignable/bifrost/renderer/onRenderHtml",
  onBeforeRoutePath: "@alignable/bifrost/renderer/onBeforeRoute",
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: "server-and-client" },
    layoutProps: { env: "server-and-client" },
    documentProps: { env: "server-and-client" },
  },
} satisfies ConfigNonHeaderFile;
