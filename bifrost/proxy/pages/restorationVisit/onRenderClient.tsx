import React from "react";
import { PageContextProxyRestorationVisit } from "../../../types/internal.js";
import { PageShell } from "../../../lib/PageShell.js";
import { copyElementAttributes, getElementAttributes } from "../../../lib/domUtils.js";
import { renderReact } from "../../../lib/renderReact.js";
import { Turbolinks } from "../../../lib/turbolinks/index.js";

export default async function onRenderClient(
  pageContext: PageContextProxyRestorationVisit
) {
  if (pageContext.isHydration) {
    throw new Error("restoration visit should never happen on initial render");
  }

  const { layoutProps, layout, bodyEl, headEl } = pageContext;
  const Layout = pageContext.config.layoutMap[layout];

  function render(body: string) {
    renderReact(
      <PageShell key={pageContext.urlOriginal} pageContext={pageContext}>
        <Layout {...layoutProps}>
          <div id="proxied-body" dangerouslySetInnerHTML={{ __html: body }} />
        </Layout>
      </PageShell>,
      pageContext.isHydration
    );
  }
  const proxyBodyEl = bodyEl.querySelector("#proxied-body");
  if (!proxyBodyEl) {
    throw new Error("proxied body not found in cached snapshot");
  }

  Turbolinks._vpsOnRenderClient(headEl, () => {
    // merge body attributes
    document.body
      .getAttributeNames()
      .forEach((n) => document.body.removeAttribute(n));
    copyElementAttributes(document.body, bodyEl);
    // render body with react
    render(proxyBodyEl.innerHTML);
  });
  // cache page context will save it and return it to us during restoration visits
  Turbolinks._vpsCachePageContext({
    layoutProps,
    layout,
    bodyAttrs: getElementAttributes(bodyEl),
  });
}
