import { PageContext } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";

export async function bifrostOnAfterRenderClient(pageContext: PageContext) {
  if (!pageContext.isHydration) {
    await Turbolinks._vikeAfterRender();
  }
}
