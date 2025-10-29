// do NOT import turbolinks in this file. It is used on server side.

import { PageContext } from "vike/types";

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined") {
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
    }
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
