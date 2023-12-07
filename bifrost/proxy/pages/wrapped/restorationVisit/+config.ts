import { Config } from "vike/types";

export default {
  route: "import:@alignable/bifrost/proxy/pages/wrapped/restorationVisit/route",
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  onBeforeRender: null,
  onRenderClient:
    "import:@alignable/bifrost/proxy/pages/wrapped/restorationVisit/onRenderClient",
  passToClient: [],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    layoutMap: { env: "server-and-client" },
    onClientInit: { env: "client-only" },
  },
} satisfies Config;
