import type { PageContext } from "vike/types";

if (import.meta.env?.SSR === false) {
  import("./turbolinksStart");
}

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined" && pageContext.isClientSide) {
    const Turbolinks = window.Turbolinks;

    let currentVisit = pageContext._turbolinksVisit;

    if (pageContext.isHistoryNavigation) {
      if (!pageContext.pageContextsAborted?.length) {
        // This can be called multiple times if guards throw redirect, only notify history pop once
        Turbolinks.controller.historyPoppedToLocationWithRestorationIdentifier(
          pageContext.urlOriginal,
          ""
        );
      }
      // Initially, currentVisit was just created by historyPoppedToLocationWithRestorationIdentifier
      // If abort rendering, we'd rather Vike pass _turbolinksVisit, but it does not, so we recover from Turbolinks global
      // There is risk of race condition if a history nav and a regular nav happen at the same time.
      currentVisit = Turbolinks.controller.currentVisit;
    }

    if (pageContext.pageContextsAborted?.length && currentVisit) {
      currentVisit.updateIfRedirect(pageContext.urlOriginal);
    }

    if (pageContext.isHistoryNavigation) {
      const snapshot = Turbolinks.controller.getCachedSnapshotForLocation(
        pageContext.urlOriginal
      );

      if (!!snapshot) {
        return {
          pageContext: {
            _snapshot: snapshot,
            _turbolinksVisit: currentVisit,
          },
        };
      }
    }
    return { pageContext: { _turbolinksVisit: currentVisit } };
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
