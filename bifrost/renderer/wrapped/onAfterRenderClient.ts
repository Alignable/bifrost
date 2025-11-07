import "../../lib/type";
import type { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import { getElementAttributes } from "../../lib/getElementAttributes";

export default async function wrappedOnAfterRenderClient(
  pageContext: PageContextClient
) {
  const { layoutProps, layout } = pageContext;
  const bodyEl = document.getElementById("proxied-body")!;
  Turbolinks._vpsCachePageContext({
    layoutProps,
    layout,
    bodyAttrs: getElementAttributes(bodyEl),
  });
  if (!pageContext.isHydration) {
    // On client navigation, tell turbolinks to run scripts and fire events
    await pageContext._waitForHeadScripts?.();
    await Turbolinks._vikeAfterRender(true);
  }
}
