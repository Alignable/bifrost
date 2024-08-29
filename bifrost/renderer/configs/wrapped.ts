import { Config } from "vike/types";

export const wrappedConfig = {
  route: "/*",
  onRenderClient:
    "import:@alignable/bifrost/proxy/pages/wrapped/onRenderClient:default",
  onRenderHtml:
    "import:@alignable/bifrost/proxy/pages/wrapped/onRenderHtml:default",
  Page: "import:@alignable/bifrost/proxy/pages/Page:default",
  passToClient: ["layout", "layoutProps", "redirectTo"],
  meta: {
    layoutMap: { env: { server: true, client: true } },
    getLayout: { env: { server: true, client: true } },
    onClientInit: { env: { client: true } },
  },
} satisfies Config;
