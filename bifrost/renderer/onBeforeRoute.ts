// do NOT import turbolinks in this file. It is used on server side.

import { PageContext } from "vike/types";

declare global {
  interface Window {
    _bifrost_pop_state?: boolean;
  }
}

const onBeforeRoute = (pageContext: PageContext) => {
  if (typeof window !== "undefined" && pageContext.isClientSide) {
    const Turbolinks = window.Turbolinks;

    const currentVisit = Turbolinks.controller.currentVisit;

    // _bifrost_pop_state and currentVisit checks are a hack to detect browser back/forward navigation
    // Waiting on https://github.com/vikejs/vike/issues/2818
    if (
      Turbolinks.controller.started &&
      (!currentVisit || currentVisit.state === "completed")
    ) {
      // See Head.tsx
      if (window._bifrost_pop_state) {
        window._bifrost_pop_state = false;
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
              _snapshot: snapshot,
            },
          };
        } else {
          return { pageContext: {} };
        }
      } else {
        throw new Error(
          `Bifrost does not support calling navigate() directly. Use navigate from "@alignable/bifrost" or Turbolinks.visit() instead.`
        );
      }
    } else if (currentVisit?.state === "started") {
      // It would be great if Vike exposed some isRedirecting flag, but we can infer it
      currentVisit.updateIfRedirect(pageContext.urlOriginal);
    }
  }
  return { pageContext: {} };
};

export default onBeforeRoute;
