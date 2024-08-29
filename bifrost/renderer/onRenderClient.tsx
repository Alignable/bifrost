import React, { PropsWithChildren } from "react";
import { renderReact } from "../lib/renderReact.js";
import {
  AugmentMe,
  PageContextNoProxyClient,
  PageContextProxyClient,
  PageContextProxyClientHydration,
  PageContextProxyClientNavigation,
  PageContextProxyClientRestorationVisit,
} from "../types/internal.js";
import { PageShell } from "../lib/PageShell.js";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { documentPropsToReact } from "./utils/buildHead.js";
import { getPageContextOrConfig } from "./getConfigOrPageContext.js";
import { createRoot } from "react-dom/client";
import { runClientInit } from "../lib/runClientInit.js";
import { getElementAttributes } from "../lib/getElementAttributes.js";
import { copyElementAttributes } from "../lib/turbolinks/util.js";

Turbolinks.start();

const PassThruLayout: React.ComponentType<PropsWithChildren> = ({
  children,
}) => <>{children}</>;

export default async function onRenderClient(
  pageContext: PageContextNoProxyClient | PageContextProxyClient
) {
  if (pageContext.config.proxyMode === "wrapped") {
    return await wrappedOnRenderClient(pageContext as PageContextProxyClient);
  } else if (pageContext.config.proxyMode === false) {
    return await noProxyOnRenderClient(pageContext as PageContextNoProxyClient);
  }
}

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

/* 
We get here in 3 ways:
1. Hydration from initial SSR
2. Client navigation
3. Back button restoration

Each path needs to generate pageContext differently
*/

async function onRenderClientHydration(
  pageContext: PageContextProxyClientHydration
) {
  const { layoutProps, layout } = pageContext;

  await runClientInit(pageContext.configEntries);
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

async function requestBackend(url: string) {
  return await fetch(url, {
    headers: { "X-VITE-PROXY": "1", accept: "text/html" },
  });
}

async function onRenderClientNavigation(
  pageContext: PageContextProxyClientNavigation
) {
  //TODO: need to share getLayout and requestBackend with fastify...
  const resp = await requestBackend(pageContext.urlOriginal);
  if (resp.redirected) {
    Turbolinks.visit(resp.url);
    return;
  }
  const html = await resp.text();
  const { layout, layoutProps } = pageContext.config.getLayout!(
    Object.fromEntries(resp.headers.entries())
  );

  const parsed = document.createElement("html");
  parsed.innerHTML = html;
  const bodyEl = parsed.querySelector("body")!;
  const headEl = parsed.querySelector("head")!;

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

async function wrappedOnRenderClient(pageContext: PageContextProxyClient) {
  if ("redirectTo" in pageContext && pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }

  if ("snapshot" in pageContext) {
    onRenderClientRestorationVisit(pageContext);
  } else if (pageContext.isHydration) {
    onRenderClientHydration(pageContext);
  } else {
    onRenderClientNavigation(pageContext);
  }
}

// TODO: redo code organization
async function noProxyOnRenderClient(pageContext: PageContextNoProxyClient) {
  if (pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }

  // Back button leading to 404 means we hit a page bifrost can't handle in the browser history.
  // Reload allows us to revert to passthru proxy and/or let ALB handle
  if (pageContext.isBackwardNavigation && pageContext.is404) {
    Turbolinks.controller.viewInvalidated();
    return;
  }

  const { Page, pageProps } = pageContext;
  const { Layout = PassThruLayout } = pageContext.config;
  const layoutProps = getPageContextOrConfig(pageContext, "layoutProps") || {};
  const bodyAttrs = getPageContextOrConfig(pageContext, "bodyAttrs") || [];

  if (!Page)
    throw new Error("Client-side render() hook expects Page to be exported");

  const page = (
    <PageShell pageContext={pageContext}>
      <Layout {...layoutProps}>
        <Page {...pageProps} />
      </Layout>
    </PageShell>
  );
  if (pageContext.isHydration) {
    // During hydration of initial ssr, body is in dom, not page props (to avoid double-send)
    await runClientInit(pageContext.configEntries);
    renderReact(page, pageContext.isHydration);
  } else {
    const head = document.createElement("head");
    createRoot(head).render(
      documentPropsToReact(
        getPageContextOrConfig(pageContext, "documentProps") || {}
      )
    );
    pageContext.config.scripts?.forEach((s) => {
      head.insertAdjacentHTML("beforeend", s);
    });

    requestAnimationFrame(() => {
      Turbolinks._vpsOnRenderClient(head, false, false, () => {
        // clear anything on body
        document.body
          .getAttributeNames()
          .forEach((n) => document.body.removeAttribute(n));
        // add set bodyAttrs
        bodyAttrs.forEach(({ name, value }) =>
          document.body.setAttribute(name, value)
        );
        renderReact(page, pageContext.isHydration);
      });
    });
  }
}
