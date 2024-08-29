import { Config } from "vike/types";

export const passthruConfig = {
  route: "/*",
  clientRouting: false,
  // Fake page:
  Page: "import:@alignable/bifrost/proxy/pages/Page:default",
  onRenderHtml:
    "import:@alignable/bifrost/proxy/pages/passthru/onRenderHtml:default",
} satisfies Config;
