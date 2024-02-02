import { type Config } from "vike/types";

const passToClient = [
  "layoutProps",
  "pageProps",
  "redirectTo",
  "documentProps",
  "scripts",
  "is404",
];
export default {
  passToClient,
  onRenderClient: "import:@alignable/bifrost/renderer/onRenderClient",
  onRenderHtml: "import:@alignable/bifrost/renderer/onRenderHtml",
  onBeforeRoute: "import:@alignable/bifrost/renderer/onBeforeRoute",
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    Layout: { env: { server: true, client: true } },
    layoutProps: { env: { server: true, client: true } },
    documentProps: { env: { server: true, client: true } },
    scripts: { env: { server: true, client: true } },
    favicon: { env: { server: true } },
    onClientInit: { env: { client: true } },
  },
} satisfies Config;
