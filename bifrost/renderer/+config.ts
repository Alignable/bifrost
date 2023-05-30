import { type ConfigNonHeaderFile } from "vite-plugin-ssr/types";

export default {
  passToClient: ["layoutProps", "pageProps", "redirectTo", "documentProps", "isLoggedIn", "scripts"],
  onRenderClient: "import:@alignable/bifrost/renderer/onRenderClient",
  onRenderHtml: "import:@alignable/bifrost/renderer/onRenderHtml",
  onBeforeRoute: "import:@alignable/bifrost/renderer/onBeforeRoute",
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: "server-and-client" },
    layoutProps: { env: "server-and-client" },
    documentProps: { env: "server-and-client" },
    isLoggedIn: { env: "server-and-client" },
    scripts: { env: "server-and-client" },
  },
} satisfies ConfigNonHeaderFile;
