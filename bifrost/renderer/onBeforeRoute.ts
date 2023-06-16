// do NOT import turbolinks in this file. It is used on server side.

export default function onBeforeRoute(_pageContext: any) {
  if (typeof window === "undefined") return undefined;
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
          ...snapshot.pageContext,
          bodyEl: snapshot.bodyEl,
          headEl: snapshot.headEl,
          _pageId: "/proxy/pages/restorationVisit",
        },
      };
    }
  }
  return undefined;
}
