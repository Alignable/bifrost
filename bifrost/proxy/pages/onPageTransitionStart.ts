import { PageContextBuiltInClientWithClientRouting } from "vite-plugin-ssr/types";
import { Turbolinks } from "../../lib/turbolinks";
// import { Visit, getAdapter } from "../../lib/turbolinks";

export default function onPageTransitionStart(
  pageContext: PageContextBuiltInClientWithClientRouting
) {
  Turbolinks._vpsWriteRestorationIdentifier()
  // const v = new Visit();
  // window.Turbolinks.controller.restorationIdentifier = v.restorationIdentifier;
  // window.Turbolinks.controller.currentVisit = v;
  // console.log(v.identifier)
  // getAdapter()?.visitStarted(v as TVisit);
  // getAdapter()?.visitRequestStarted(v as TVisit);
}
