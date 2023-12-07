import { Config } from "vike/types";

export default {
  route: "/*",
  // Fake page:
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  onRenderHtml: "import:@alignable/bifrost/proxy/pages/passthru/onRenderHtml",
  onRenderClient:
    "import:@alignable/bifrost/proxy/pages/passthru/onRenderClient",
} satisfies Config;
