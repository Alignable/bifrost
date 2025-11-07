import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";

Turbolinks.start();

export default async function bifrostOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration) {
    await Turbolinks._vikeBeforeRender();
  }
}
