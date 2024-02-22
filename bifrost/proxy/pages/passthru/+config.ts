import { Config } from "vike/types";

export default {
  route: "/*",
  clientRouting: false,
  // Fake page:
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  onRenderHtml: "import:@alignable/bifrost/proxy/pages/passthru/onRenderHtml",
} satisfies Config;
