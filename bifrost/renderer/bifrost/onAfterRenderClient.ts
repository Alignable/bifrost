import { PageContextClient } from "vike/types";
import "../../lib/type";
import { Turbolinks } from "../../lib/turbolinks";

export default async function bifrostOnAfterRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration) {
    await Turbolinks._vikeAfterRender(pageContext._turbolinksVisit, false);
  }
}
