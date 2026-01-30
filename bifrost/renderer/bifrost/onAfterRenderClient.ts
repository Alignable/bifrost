import { PageContextClient } from "vike/types";
import "../../lib/type";
import { Turbolinks } from "../../lib/turbolinks";

export default function bifrostOnAfterRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration && !pageContext.errorWhileRendering) {
    Turbolinks._vikeAfterRender(pageContext._turbolinksVisit, false);
  }
}
