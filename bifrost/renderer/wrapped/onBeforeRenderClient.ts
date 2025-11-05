import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import { copyElementAttributes } from "../../lib/turbolinks/util";
import { mergeHead } from "../../lib/turbolinks/mergeHead";

// TODO: Should this live in +data or onData instead?
export async function wrappedOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (pageContext.isHydration) {
    pageContext._turbolinksProxy = {
      body: document.getElementById("proxied-body")!,
    };
    return;
  }

  if (pageContext?.snapshot) {
    if (pageContext.isHydration) {
      throw new Error(
        "restoration visit should never happen on initial render"
      );
    }
    const { layoutProps, layout } = pageContext.snapshot.pageContext;
    const { bodyEl, headEl } = pageContext.snapshot;
    const proxyBodyEl = bodyEl.querySelector("#proxied-body")!;
    if (!proxyBodyEl || !(proxyBodyEl instanceof HTMLElement)) {
      throw new Error("proxied body not found in cached snapshot");
    }
    pageContext.layout = layout;
    pageContext.layoutProps = layoutProps;
    pageContext._turbolinksProxy = {
      body: proxyBodyEl,
    };

    await Turbolinks._vikeBeforeRender(() => {
      const waitForHeadScripts = mergeHead(headEl);
      pageContext._waitForHeadScripts = () => waitForHeadScripts;
    });
    copyBody(bodyEl);
  } else {
    const { head, body } = pageContext._turbolinksProxy!;

    await Turbolinks._vikeBeforeRender(() => {
      const waitForHeadScripts = mergeHead(head!);
      pageContext._waitForHeadScripts = () => waitForHeadScripts;
    });
    copyBody(body);
  }
}

// Copy over body attributes because vike-react only handles body on initial render
function copyBody(bodyEl: HTMLElement) {
  document.body
    .getAttributeNames()
    .forEach((n) => document.body.removeAttribute(n));
  copyElementAttributes(document.body, bodyEl);
}
