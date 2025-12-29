import "../../lib/type";
import type { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import { copyElementAttributes } from "../../lib/turbolinks/util";
import { mergeHead } from "../../lib/turbolinks/mergeHead";
import {
  setBodyAttributes,
  getElementAttributes,
} from "../../lib/elementUtils";

export default async function wrappedOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (pageContext.isHydration) {
    // Vike scripts load async so can run before document.body exists. we need to delay rendering.
    // This is only an issue if user sets `injectScriptsAt: "HTML_BEGIN"` in +config.ts
    if (document.readyState === "loading") {
      await new Promise((resolve) =>
        document.addEventListener("DOMContentLoaded", () => resolve(null))
      );
    }
    pageContext._turbolinksProxy = {
      body: document.getElementById("proxied-body")!,
    };
    return;
  }

  if (pageContext?._snapshot) {
    if (pageContext.isHydration) {
      throw new Error(
        "restoration visit should never happen on initial render"
      );
    }
    const { proxyLayoutInfo } = pageContext._snapshot.pageContext;
    const { bodyEl, headEl } = pageContext._snapshot;
    const proxyBodyEl = bodyEl.querySelector("#proxied-body")!;
    if (!proxyBodyEl || !(proxyBodyEl instanceof HTMLElement)) {
      throw new Error("proxied body not found in cached snapshot");
    }
    pageContext.proxyLayoutInfo = proxyLayoutInfo;
    pageContext._turbolinksProxy = {
      bodyAttrs: getElementAttributes(bodyEl),
      body: proxyBodyEl,
      head: headEl,
    };
  }
  const { head, bodyAttrs } = pageContext._turbolinksProxy!;
  pageContext._shouldEmitBeforeRender = true;

  await Turbolinks._vikeBeforeRender(
    pageContext._turbolinksVisit,
    pageContext.errorWhileRendering
  );
  const { waitForReload, waitForHeadScripts } = mergeHead(head!);

  // If a full reload is required, wait for it here
  await waitForReload();
  pageContext._waitForHeadScripts = waitForHeadScripts;

  if (bodyAttrs) setBodyAttributes(bodyAttrs);
}
