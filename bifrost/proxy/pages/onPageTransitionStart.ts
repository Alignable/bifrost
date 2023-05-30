import { PageContextBuiltInClientWithClientRouting } from "vite-plugin-ssr/types";
import { Visit as TVisit } from "turbolinks/dist/visit";
import { Visit, getAdapter } from "../../lib/turbolinks";

export default function onPageTransitionStart(
  pageContext: PageContextBuiltInClientWithClientRouting
) {
  const v = new Visit();
  window.Turbolinks.controller.restorationIdentifier = v.restorationIdentifier;
  window.Turbolinks.controller.currentVisit = v;
  console.log(v.identifier)
  getAdapter()?.visitStarted(v as TVisit);
  getAdapter()?.visitRequestStarted(v as TVisit);
}
