import React, { PropsWithChildren } from "react";
import {
  AugmentMe,
  PageContextProxyClient,
  PageContextProxyClientHydration,
  PageContextProxyClientNavigation,
  PageContextProxyClientRestorationVisit,
} from "../../types/internal";
import { PageShell } from "../../lib/PageShell";
import { getElementAttributes } from "../../lib/getElementAttributes";
import { renderReact } from "../../lib/renderReact";
import { Turbolinks } from "../../lib/turbolinks";
import { copyElementAttributes } from "../../lib/turbolinks/util";

const PassThruLayout: React.ComponentType<PropsWithChildren> = ({
  children,
}) => <>{children}</>;

/* 
We get here in 3 ways:
1. Hydration from initial SSR
2. Client navigation
3. Back button restoration

Each path needs to generate pageContext differently
*/

export async function wrappedOnRenderClient(
  pageContext: PageContextProxyClient
) {
  if ("snapshot" in pageContext) {
    return onRenderClientRestorationVisit(pageContext);
  } else if (pageContext.isHydration) {
    return onRenderClientHydration(pageContext);
  } else {
    return onRenderClientNavigation(pageContext);
  }
}

async function onRenderClientHydration(
  pageContext: PageContextProxyClientHydration
) {
  const { layoutProps, layout } = pageContext;

  await pageContext.config.onClientInit?.();
  const bodyEl = document.getElementById("proxied-body")!;
  // During hydration of initial ssr, body is in dom, not page props (to avoid double-send)
  render({
    html: bodyEl.innerHTML,
    layout,
    layoutProps,
    bodyEl,
    pageContext,
  });
}

async function onRenderClientNavigation(
  pageContext: PageContextProxyClientNavigation
) {
  Turbolinks._vpsOnRenderClient(headEl, true, true, () => {
    // merge body attributes
    document.body
      .getAttributeNames()
      .forEach((n) => document.body.removeAttribute(n));
    copyElementAttributes(document.body, bodyEl);
    // render body with react
    render({
      html: bodyEl.innerHTML,
      layout,
      layoutProps,
      bodyEl,
      pageContext,
    });
  });
}

async function onRenderClientRestorationVisit(
  pageContext: PageContextProxyClientRestorationVisit
) {
  if (pageContext.isHydration) {
    throw new Error("restoration visit should never happen on initial render");
  }
  const { layoutProps, layout } = pageContext.snapshot.pageContext;
  const { bodyEl, headEl } = pageContext.snapshot;
  const proxyBodyEl = bodyEl.querySelector("#proxied-body");
  if (!proxyBodyEl) {
    throw new Error("proxied body not found in cached snapshot");
  }
  Turbolinks._vpsOnRenderClient(headEl, true, true, () => {
    // merge body attributes
    document.body
      .getAttributeNames()
      .forEach((n) => document.body.removeAttribute(n));
    copyElementAttributes(document.body, bodyEl);
    // render body with react
    render({
      html: proxyBodyEl.innerHTML,
      layout,
      layoutProps,
      bodyEl,
      pageContext,
    });
  });
}

// Helper to render proxied html into a layout. Copies over body attributes and trigger Turoblinks caching.
function render({
  html,
  layout,
  layoutProps,
  bodyEl,
  pageContext,
}: {
  html: string;
  layout: string;
  layoutProps: AugmentMe.LayoutProps;
  bodyEl: Element;
  pageContext: PageContextProxyClient;
}) {
  const { layoutMap } = pageContext.config;
  if (!layoutMap) {
    throw new Error("layoutMap needs to be defined in config");
  }
  const Layout = layoutMap[layout] || PassThruLayout;
  renderReact(
    <PageShell key={pageContext.urlOriginal} pageContext={pageContext}>
      <Layout {...layoutProps}>
        <div id="proxied-body" dangerouslySetInnerHTML={{ __html: html }} />
      </Layout>
    </PageShell>,
    pageContext.isHydration
  );
  // cache page context will save it and return it to us during restoration visits
  Turbolinks._vpsCachePageContext({
    layoutProps,
    layout,
    bodyAttrs: getElementAttributes(bodyEl),
  });
}
