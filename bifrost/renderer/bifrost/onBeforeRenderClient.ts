import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";

export default async function bifrostOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration) {
    await Turbolinks._vikeBeforeRender(
      pageContext._turbolinksVisit,
      pageContext.errorWhileRendering
    );
  }
}
