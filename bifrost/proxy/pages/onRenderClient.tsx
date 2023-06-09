import React from "react";
import { renderReact } from "../../lib/renderReact.js";
import { PageShell } from "../../lib/PageShell.js";
import { PageContextProxyClient } from "../../types/internal.js";
import { Turbolinks } from "../../lib/turbolinks/index.js";
import {
  copyElementAttributes,
  getElementAttributes,
} from "../../lib/turbolinks/util.js";

Turbolinks.start();

export default async function onRenderClient(
  pageContext: PageContextProxyClient
) {
  if (pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }
  const { layoutProps, layout } = pageContext;

  const { layoutMap } = pageContext.config;
  if (!layoutMap) {
    throw new Error("layoutMap needs to be defined in config");
  }
  const Layout = layoutMap[layout];

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
  let bodyEl: Element;

  if (pageContext.isHydration) {
    // During hydration of initial ssr, body is in dom, not page props (to avoid double-send)
    bodyEl = document.getElementById("proxied-body")!;
    render(bodyEl.innerHTML);
  } else {
    const { proxySendClient: proxy } = pageContext;

    if (!proxy) {
      console.error("proxy/+onRenderClient did not receive proxySendClient");
      return;
    }

    const parsed = document.createElement("html");
    parsed.innerHTML = proxy;
    bodyEl = parsed.querySelector("body")!;
    const headEl = parsed.querySelector("head")!;

    Turbolinks._vpsOnRenderClient(headEl, true, () => {
      // merge body attributes
      document.body
        .getAttributeNames()
        .forEach((n) => document.body.removeAttribute(n));
      copyElementAttributes(document.body, bodyEl);
      // render body with react
      render(bodyEl.innerHTML);
    });

    // const snapshot =
    //   pageContext.snapshot || (proxy && Snapshot.fromHTMLString(proxy));

    // Turbolinks._vpsRenderClientWith(
    //   new SnapshotRenderer(
    //     Snapshot.fromHTMLElement(document.documentElement as HTMLHtmlElement),
    //     snapshot,
    //     false,
    //     render
    //   )
    // );

    //   await mergeHead(proxy.head);
    // });
    // writeRestorationIdentifier(pageContext);
  }

  // cache page context will save it and return it to us during restoration visits
  Turbolinks._vpsCachePageContext({
    layoutProps,
    layout,
    bodyAttrs: getElementAttributes(bodyEl),
  });
}
