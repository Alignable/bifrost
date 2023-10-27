// do NOT import turbolinks in this file. It is used on server side.

const onBeforeRoute = () => {
  if (typeof window !== "undefined") {
    const Turbolinks = window.Turbolinks;

    const currentVisit = Turbolinks.controller.currentVisit;
    if (!currentVisit || currentVisit.state === "completed") {
      // old/nonexistent currentVisit means VPS is doing history navigation. Ideally we might turn off VPS' onpopstate listener.
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
            isBackwardNavigation: true,
            _pageId: "/proxy/pages/restorationVisit",
          },
        };
      } else {
        return {
          pageContext: { isBackwardNavigation: true },
        };
      }
    }
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
