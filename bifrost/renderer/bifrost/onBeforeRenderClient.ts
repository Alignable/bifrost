import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";

Turbolinks.start();

export default async function bifrostOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  // TODO: Is this still needed?
  // Back button leading to 404 means we hit a page bifrost can't handle in the browser history.
  // Reload allows us to revert to passthru proxy and/or let ALB handle
  if (pageContext.isBackwardNavigation && pageContext.is404) {
    Turbolinks.controller.viewInvalidated();
    return;
  }

  if (!pageContext.isHydration) {
    await new Promise(requestAnimationFrame);
    await Turbolinks._vikeBeforeRender();
  }
}
