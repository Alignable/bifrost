import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import { setBodyAttributes } from "../../lib/elementUtils";

export default async function bifrostOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (!pageContext.isHydration && !pageContext.errorWhileRendering) {
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
}
