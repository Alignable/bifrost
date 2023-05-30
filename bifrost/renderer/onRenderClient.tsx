import React, { PropsWithChildren } from "react";
import { renderReact } from "../lib/renderReact.js";
import { PageContextNoProxyClient } from "../types/internal.js";
import { PageShell } from "../lib/PageShell.js";
import { turbolinksClickListener } from "../lib/linkInterceptor.js";
import { getDocumentProps } from "./getDocumentProps.js";
import { Turbolinks, cacheProxiedBody, setupTurbolinks } from "../lib/turbolinks.js";
import { formatMetaObject } from "./utils/formatMetaObject.js";

setupTurbolinks();

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
  const { Layout = PassThruLayout, layoutProps } = pageContext.config;

  if (!Page)
    throw new Error("Client-side render() hook expects Page to be exported");

  document.removeEventListener("click", turbolinksClickListener);
  cacheProxiedBody();

  const { title = "", description = "", viewport } = getDocumentProps(pageContext);
  document.title = title;
  document.head
    .querySelector("meta[name='description']")
    ?.setAttribute("content", description);
  if (viewport) {
    document.head
      .querySelector("meta[name='viewport']")
      ?.setAttribute("content", formatMetaObject(viewport));
  }

  const page = (
    <PageShell pageContext={pageContext}>
      <Layout {...layoutProps}>
        <Page {...pageProps} />
      </Layout>
    </PageShell>
  );

  renderReact(page, pageContext.isHydration);
}
