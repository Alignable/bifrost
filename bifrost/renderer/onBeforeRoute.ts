// do NOT import turbolinks in this file. It is used on server side.

import type { PageContext } from "vike/types";

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined" && pageContext.isClientSide) {
    const Turbolinks = window.Turbolinks;

    let currentVisit = Turbolinks.controller.currentVisit;
    console.log("onBeforeRoute", pageContext);

    if (pageContext.isHistoryNavigation) {
      // See Head.tsx
      const snapshot = Turbolinks.controller.getCachedSnapshotForLocation(
        window.location.href
      );
      Turbolinks.controller.historyPoppedToLocationWithRestorationIdentifier(
        window.location.href,
        ""
      );

      // currentVisit was just created by historyPoppedToLocationWithRestorationIdentifier
      currentVisit = Turbolinks.controller.currentVisit;
      if (!!snapshot) {
        return {
          pageContext: {
            _snapshot: snapshot,
            _turbolinksVisit: currentVisit,
          },
        };
      }
    } else if (
      Turbolinks.controller.started &&
      (!currentVisit || currentVisit.state === "completed") &&
      !pageContext.errorWhileRendering
    ) {
      throw new Error(
        `Bifrost does not support calling navigate() directly. Use navigate from "@alignable/bifrost" or Turbolinks.visit() instead.`
      );
    } else if (currentVisit?.state === "started") {
      // It would be great if Vike exposed some isRedirecting flag, but we can infer it
      currentVisit.updateIfRedirect(pageContext.urlOriginal);
    }
    return { pageContext: { _turbolinksVisit: currentVisit } };
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
