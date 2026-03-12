import { PageContextClient } from "vike/types";
import "../../lib/type";
import { Turbolinks } from "../../lib/turbolinks";
import { instrument } from "../../lib/diagnostic.client";

export default instrument("bifrostOnAfterRenderClient", function bifrostOnAfterRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration && !pageContext.errorWhileRendering) {
    Turbolinks._vikeAfterRender(pageContext._turbolinksVisit, false);
  }
});
