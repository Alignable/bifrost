import { Config } from "vite-plugin-ssr/types";

export default {
  route: "import:@alignable/bifrost/proxy/pages/restorationVisit/route",
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  onBeforeRender: null,
  onRenderClient:
    "import:@alignable/bifrost/proxy/pages/restorationVisit/onRenderClient",
  passToClient: [],
  clientRouting: true,
  hydrationCanBeAborted: true,
} satisfies Config;
