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

    const parsed = document.createElement("html");
    parsed.innerHTML = html;
    const bodyEl = parsed.querySelector("body")!;
    const headEl = parsed.querySelector("head")!;

    await new Promise(requestAnimationFrame);
    const waitForHeadScripts = await Turbolinks._vikeBeforeRender(headEl, true);

    document.body
      .getAttributeNames()
      .forEach((n) => document.body.removeAttribute(n));
    copyElementAttributes(document.body, bodyEl);

    pageContext._waitForHeadScripts = waitForHeadScripts;
    pageContext.layout = layout;
    pageContext.layoutProps = layoutProps;
    pageContext._wrappedBodyHtml = bodyEl.innerHTML;
  }
}
