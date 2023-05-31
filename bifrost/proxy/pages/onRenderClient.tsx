import React from "react";
import { renderReact } from "../../lib/renderReact.js";
import { PageShell } from "../../lib/PageShell.js";
import { PageContextProxyClient } from "../../types/internal.js";
import { Turbolinks } from "../../lib/turbolinks/index.js";
import { Snapshot } from "../../lib/turbolinks/snapshot.js";
import { SnapshotRenderer } from "../../lib/turbolinks/snapshot_renderer.js";

Turbolinks.start();

export default async function onRenderClient(
  pageContext: PageContextProxyClient
) {
  if (pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }

  let body: string;

  const { layoutProps, layout } = pageContext;
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

  if (pageContext.isHydration) {
    // During hydration of initial ssr, body is in dom, not page props (to avoid double-send)
    body = document.getElementById("proxied-body")!.innerHTML;
    render(body);
  } else {
    const { proxySendClient: proxy } = pageContext;

    const snapshot =
      pageContext.snapshot || (proxy && Snapshot.fromHTMLString(proxy));

    if (!snapshot) {
      console.error(
        "proxy/+onRenderClient did not receive proxySendClient nor is there a cached snapshot"
      );
      return;
    }

    Turbolinks._vpsRenderClientWith(
      new SnapshotRenderer(
        Snapshot.fromHTMLElement(document.documentElement as HTMLHtmlElement),
        snapshot,
        false,
        render
      )
    );

    //   document.body
    //     .getAttributeNames()
    //     .forEach((n) => document.body.removeAttribute(n));
    //   for (const [name, value] of Object.entries(proxy.bodyAttrs)) {
    //     document.body.setAttribute(name, value);
    //   }

    //   await mergeHead(proxy.head);
    // });
    // writeRestorationIdentifier(pageContext);
  }
}
