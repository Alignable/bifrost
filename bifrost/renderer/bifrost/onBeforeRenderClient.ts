import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import { setBodyAttributes } from "../../lib/elementUtils";
import { recordExistingHeadScripts } from "../../lib/turbolinks/mergeHead";
import { instrument } from "../../lib/diagnostic.client";

export default instrument("bifrostOnBeforeRenderClient", async function bifrostOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (pageContext.isHydration) {
    // Snapshots clone the whole head, so anything already here (including the inline Turbolinks stub) would re-run on restore
    recordExistingHeadScripts();
    return;
  }
  if (!pageContext.errorWhileRendering) {
    pageContext._shouldEmitBeforeRender = true;
    await Turbolinks._vikeBeforeRender(pageContext._turbolinksVisit);

    // Copy over body attributes because vike-react only handles body on initial render, and we need to reset when coming from wrapped
    if (pageContext.config.bodyAttributes)
      setBodyAttributes(
        pageContext.config.bodyAttributes.reduce(
          (acc, attrs) => ({ ...acc, ...attrs }),
          {}
        )
      );
  }
});
