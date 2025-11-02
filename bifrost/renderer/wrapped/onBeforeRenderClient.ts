import { PageContextClient } from "vike/types";
import { Turbolinks } from "../../lib/turbolinks";
import { copyElementAttributes } from "../../lib/turbolinks/util";

// TODO: Should this live in +data or onData instead?
export async function wrappedOnBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (pageContext.isHydration) {
    pageContext._wrappedBodyHtml =
      document.getElementById("proxied-body")!.innerHTML;
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
    const proxyBodyEl = bodyEl.querySelector("#proxied-body");
    if (!proxyBodyEl) {
      throw new Error("proxied body not found in cached snapshot");
    }
    pageContext.layout = layout;
    pageContext.layoutProps = layoutProps;
    pageContext._wrappedBodyHtml = proxyBodyEl.innerHTML;

    await new Promise(requestAnimationFrame);
    pageContext._waitForHeadScripts = await Turbolinks._vikeBeforeRender(
      headEl,
      true
    );
    copyBody(bodyEl);
  } else {
    const resp = await fetch(pageContext.urlOriginal, {
      headers: { ...pageContext.config.proxyHeaders, accept: "text/html" },
    });

    if (resp.redirected) {
      /// Redirect /
      Turbolinks.visit(resp.url);
      return;
    }
    if (!resp.ok) {
      window.location.href = resp.url;
    }
    const html = await resp.text();
    const { layout, layoutProps } = pageContext.config.getLayout!(
      Object.fromEntries(resp.headers.entries())
    );
    if (!pageContext.config.layoutMap?.[layout]) {
      // Fallback to full reload if layout not found
      window.location.href = resp.url;
    }

    const parsed = document.createElement("html");
    parsed.innerHTML = html;
    const bodyEl = parsed.querySelector("body")!;
    const headEl = parsed.querySelector("head")!;
    pageContext.layout = layout;
    pageContext.layoutProps = layoutProps;
    pageContext._wrappedBodyHtml = bodyEl.innerHTML;

    await new Promise(requestAnimationFrame);
    pageContext._waitForHeadScripts = await Turbolinks._vikeBeforeRender(
      headEl,
      true
    );
    copyBody(bodyEl);
  }
}

// Copy over body because vike-react only handles body on initial render
function copyBody(bodyEl: HTMLElement) {
  document.body
    .getAttributeNames()
    .forEach((n) => document.body.removeAttribute(n));
  copyElementAttributes(document.body, bodyEl);
}
