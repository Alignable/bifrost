import "../../lib/type";
import type { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import {
  mergeHead,
  recordExistingHeadScripts,
} from "../../lib/turbolinks/mergeHead";
import {
  setBodyAttributes,
  getElementAttributes,
} from "../../lib/elementUtils";
import { instrument } from "../../lib/diagnostic.client";

export default instrument("wrappedOnBeforeRenderClient", async function wrappedOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (pageContext.isHydration) {
    // Vike scripts load async so can run before document.body exists. we need to delay rendering.
    // This is only an issue if user sets `injectScriptsAt: "HTML_BEGIN"` in +config.ts
    if (document.readyState === "loading") {
      await instrument("_waitForDOMContentLoaded", () => new Promise((resolve) =>
        document.addEventListener("DOMContentLoaded", () => resolve(null), { once: true})
      ))();
    }

    // This should be caught by onAfterRenderHtml, but just in case, check again on client side
    const proxiedBody = document.getElementById("proxied-body");
    if (!proxiedBody) {
      throw new Error(
        "proxied-body not found in DOM after SSR. This likely means the Layout threw during SSR (e.g. accessing `window` or `document`). Fix the SSR error in your Layout component."
      );
    }
    pageContext._turbolinksProxy = {
      body: proxiedBody,
    };
    Turbolinks._vpsCachePageContext({
      proxyLayoutInfo: pageContext.proxyLayoutInfo,
      proxyNestedComponents: pageContext.proxyNestedComponents,
    });
    recordExistingHeadScripts();
    return;
  }

  if (pageContext?._snapshot) {
    if (pageContext.isHydration) {
      throw new Error(
        "restoration visit should never happen on initial render"
      );
    }
    const { proxyLayoutInfo, proxyNestedComponents } =
      pageContext._snapshot.pageContext;
    const { bodyEl, headEl } = pageContext._snapshot;
    const proxyBodyEl = bodyEl.querySelector("#proxied-body")!;
    if (!proxyBodyEl || !(proxyBodyEl instanceof HTMLElement)) {
      throw new Error("proxied body not found in cached snapshot");
    }
    pageContext.proxyLayoutInfo = proxyLayoutInfo;
    pageContext.proxyNestedComponents = proxyNestedComponents;
    pageContext._turbolinksProxy = {
      bodyAttrs: getElementAttributes(bodyEl),
      body: proxyBodyEl,
      head: headEl,
    };
  }
  const { head, bodyAttrs } = pageContext._turbolinksProxy!;
  pageContext._shouldEmitBeforeRender = true;

  await Turbolinks._vikeBeforeRender(pageContext._turbolinksVisit, {
    proxyLayoutInfo: pageContext.proxyLayoutInfo,
  });
  const { waitForReload, waitForHeadScripts } = mergeHead(head!);

  // If a full reload is required, wait for it here
  await waitForReload();
  pageContext._waitForHeadScripts = waitForHeadScripts;

  if (bodyAttrs) setBodyAttributes(bodyAttrs);

  pageContext._reactRenderTimeout = setTimeout(() => {
    pageContext.config.onWrappedReactRenderTimeout?.(pageContext);
  }, 30000);
});
