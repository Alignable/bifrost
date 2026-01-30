import "../../lib/type";
import type { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";

export default async function wrappedOnAfterRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration) {
    // On client navigation, tell turbolinks to run scripts and fire events
    await pageContext._waitForHeadScripts?.();
    Turbolinks._vikeAfterRender(pageContext._turbolinksVisit, true);
  }
}
