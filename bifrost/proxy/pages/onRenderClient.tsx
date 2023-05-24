import React from "react";
import { renderReact } from "../../lib/renderReact.js";
import { PageShell } from "../../lib/PageShell.js";
import { PageContextProxyClient } from "../../types/internal.js";
import { turbolinksClickListener } from "../../lib/linkInterceptor.js";
import { dispatchTurbolinks } from "../../lib/dispatchTurbolinks.js";
import { mergeHead } from "../../lib/mergeHead.js";
import {
  cacheProxiedBody,
  writeRestorationIdentifier,
} from "../../lib/snapshots.js";
import { navigateAnywhere } from "../../lib/navigateAnywhere.js";
import { setupTurbolinks } from "../../lib/turbolinks.js";

setupTurbolinks()

export default async function onRenderClient(
  pageContext: PageContextProxyClient
) {
  if (navigateAnywhere(pageContext.redirectTo)) return;

  let body: string;

  const { layoutProps, layout } = pageContext;
  const Layout = pageContext.config.layoutMap[layout];

  if (pageContext.isHydration) {
    // During hydration of initial ssr, body is in dom, not page props (to avoid double-send)
    body = document.getElementById("proxied-body")!.innerHTML;
  } else {
    const { proxySendClient: proxy } = pageContext;

    if (!proxy) {
      console.error(
        "proxy/+onRenderClient did not receive proxySendClient nor is there a cached snapshot"
      );
      return;
    }

    cacheProxiedBody();
    dispatchTurbolinks("turbolinks:before-render", { newBody: proxy.body });

    body = proxy.body;

    document.body
      .getAttributeNames()
      .forEach((n) => document.body.removeAttribute(n));
    for (const [name, value] of Object.entries(proxy.bodyAttrs)) {
      document.body.setAttribute(name, value);
    }

    mergeHead(proxy.head);
  }
  writeRestorationIdentifier(pageContext);
  // addEventListener de-dupes so we are safe to just blindly call this every time
  // non-proxy pages remove the listener
  document.addEventListener("click", turbolinksClickListener);
  renderReact(
    <PageShell key={pageContext.urlOriginal} pageContext={pageContext}>
      <Layout {...layoutProps}>
        <div id="proxied-body" dangerouslySetInnerHTML={{ __html: body }} />
      </Layout>
    </PageShell>,
    pageContext.isHydration
  );
}
