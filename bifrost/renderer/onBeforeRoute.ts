import type { PageContext } from "vike/types";

if (import.meta.env?.SSR === false) {
  import("./turbolinksStart");
}

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined" && pageContext.isClientSide) {
    const Turbolinks = window.Turbolinks;

    let currentVisit = pageContext._turbolinksVisit;

    if (pageContext.isHistoryNavigation) {
      const snapshot = Turbolinks.controller.getCachedSnapshotForLocation(
        pageContext.urlOriginal
      );
      Turbolinks.controller.historyPoppedToLocationWithRestorationIdentifier(
        pageContext.urlOriginal,
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
    } else if (pageContext.pageContextsAborted && currentVisit) {
      currentVisit.updateIfRedirect(pageContext.urlOriginal);
    }
    return { pageContext: { _turbolinksVisit: currentVisit } };
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
