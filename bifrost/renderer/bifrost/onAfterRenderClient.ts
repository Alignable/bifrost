import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";

export async function bifrostOnAfterRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration) {
    await Turbolinks._vikeAfterRender(false);
  }
}
