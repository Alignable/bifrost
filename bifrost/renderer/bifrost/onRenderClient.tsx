import React from "react";
import { createRoot } from "react-dom/client";
import { PageShell } from "../../lib/PageShell";
import { renderReact } from "../../lib/renderReact";
import { Turbolinks } from "../../lib/turbolinks";
import { PageContextNoProxyClient } from "../../types/internal";
import { PassThruLayout } from "../utils/PassthruLayout";
import { documentPropsToReact } from "../utils/buildHead";
import { getPageContextOrConfig } from "../utils/getConfigOrPageContext";
import { resolveScripts } from "../utils/resolveScripts";

export async function bifrostOnRenderClient(
  pageContext: PageContextNoProxyClient
) {
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
    await pageContext.config.onClientInit?.();
    renderReact(page, pageContext.isHydration);
  } else {
    const head = document.createElement("head");
    createRoot(head).render(
      documentPropsToReact(
        getPageContextOrConfig(pageContext, "documentProps") || {}
      )
    );
    (pageContext.config.scripts || []).forEach((sarr) => {
      sarr.forEach((s) => {
        head.insertAdjacentHTML("beforeend", s);
      });
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
