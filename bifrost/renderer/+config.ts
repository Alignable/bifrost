import { type Config } from "vike/types";

const passToClient = [
  "layoutProps",
  "pageProps",
  "redirectTo",
  "documentProps",
  "scripts",
];
export default {
  passToClient,
  onRenderClient: "import:@alignable/bifrost/renderer/onRenderClient",
  onRenderHtml: "import:@alignable/bifrost/renderer/onRenderHtml",
  onBeforeRoute: "import:@alignable/bifrost/renderer/onBeforeRoute",
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: "server-and-client" },
    layoutProps: { env: "server-and-client" },
    documentProps: { env: "server-and-client" },
    scripts: { env: "server-and-client" },
    favicon: { env: "server-only" },
    onClientInit: { env: "client-only" },
  },
} satisfies Config;
