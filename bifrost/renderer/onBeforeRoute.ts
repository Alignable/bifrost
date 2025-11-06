// do NOT import turbolinks in this file. It is used on server side.

import { PageContext } from "vike/types";

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined" && pageContext.isClientSide) {
    const Turbolinks = window.Turbolinks;

    const currentVisit = Turbolinks.controller.currentVisit;
    if (pageContext.isBackwardNavigation) {
      const snapshot = Turbolinks.controller.getCachedSnapshotForLocation(
        window.location.href
      );
      Turbolinks.controller.historyPoppedToLocationWithRestorationIdentifier(
        window.location.href,
        ""
      );

      if (!!snapshot) {
        return {
          pageContext: {
            snapshot,
          },
        };
      } else {
        return { pageContext: {} };
      }
    } else if (
      Turbolinks.controller.started &&
      (!currentVisit || currentVisit.state === "completed")
    ) {
      throw new Error(
        `Bifrost does not support calling navigate() directly. Use navigate from "@alignable/bifrost" or Turbolinks.visit() instead.`
      );
    } else if (currentVisit?.state === "started") {
      // It would be great if Vike exposed some isRedirecting flag, but we can infer it
      currentVisit.updateIfRedirect(pageContext.urlOriginal);
    }
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
