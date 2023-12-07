import { type Config } from "vike/types";

export default {
  route: "/*",
  onBeforeRender:
    "import:@alignable/bifrost/proxy/pages/wrapped/onBeforeRender",
  onRenderClient:
    "import:@alignable/bifrost/proxy/pages/wrapped/onRenderClient",
  onRenderHtml: "import:@alignable/bifrost/proxy/pages/wrapped/onRenderHtml",
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  passToClient: ["proxySendClient", "layout", "layoutProps", "redirectTo"],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    layoutMap: { env: "server-and-client" },
    onClientInit: { env: "client-only" },
  },
} satisfies Config;
