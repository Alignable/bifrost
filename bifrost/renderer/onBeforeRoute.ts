import type { PageContext } from "vike/types";

if (import.meta.env?.SSR === false) {
  import("./turbolinksStart");
}

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined" && pageContext.isClientSide) {
    const Turbolinks = window.Turbolinks;

    let currentVisit = Turbolinks.controller.currentVisit;

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
    } else if (currentVisit?.state === "started") {
      // It would be great if Vike exposed some isRedirecting flag, but we can infer it
      currentVisit.updateIfRedirect(pageContext.urlOriginal);
    }
    return { pageContext: { _turbolinksVisit: currentVisit } };
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
