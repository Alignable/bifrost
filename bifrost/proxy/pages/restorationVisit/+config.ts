import { Config } from "vite-plugin-ssr/types";

export default {
  route: "import:@alignable/bifrost/proxy/pages/restorationVisit/route",
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  onBeforeRender:
    "import:@alignable/bifrost/proxy/pages/restorationVisit/onBeforeRender",
  onRenderClient:
    "import:@alignable/bifrost/proxy/pages/restorationVisit/onRenderClient",
  passToClient: [],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    onBeforeRender: {
      // We tell vite-plugin-ssr to load and execute onBeforeRender() on the client-side.
      // Moving onBeforeRender to client tells VPS it does not need to make network request on navigation
      env: "client-only",
    },
  },
} satisfies Config;
