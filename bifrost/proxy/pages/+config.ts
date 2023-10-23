import { type Config } from "vike/types";

export default {
  route: "/*",
  onBeforeRender: "import:@alignable/bifrost/proxy/pages/onBeforeRender",
  onRenderClient: "import:@alignable/bifrost/proxy/pages/onRenderClient",
  onRenderHtml: "import:@alignable/bifrost/proxy/pages/onRenderHtml",
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  passToClient: ["proxySendClient", "layout", "layoutProps", "redirectTo"],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    layoutMap: { env: "server-and-client" },
  },
} satisfies Config;
