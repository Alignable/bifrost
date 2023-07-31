import React, { PropsWithChildren } from "react";
import { renderReact } from "../lib/renderReact.js";
import { PageContextNoProxyClient } from "../types/internal.js";
import { PageShell } from "../lib/PageShell.js";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { documentPropsToReact } from "./utils/buildHead.js";
import { getPageContextOrConfig } from "./getConfigOrPageContext.js";
import { createRoot } from "react-dom/client";

Turbolinks.start();

const PassThruLayout: React.ComponentType<PropsWithChildren> = ({
  children,
}) => <>{children}</>;

export default async function onRenderClient(
  pageContext: PageContextNoProxyClient
) {
  if (pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }

  const { Page, pageProps } = pageContext;
  const { Layout = PassThruLayout } = pageContext.config;
  const layoutProps = getPageContextOrConfig(pageContext, "layoutProps") || {};

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
        renderReact(page, pageContext.isHydration);
      });
    });
  }
}
