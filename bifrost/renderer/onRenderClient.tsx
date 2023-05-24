import React from "react";
import { renderReact } from "../lib/renderReact";
import { PageContextNoProxyClient } from "../types/internal";
import { PageShell } from "../lib/PageShell";
import { turbolinksClickListener } from "../lib/linkInterceptor";
import { getDocumentProps } from "./getDocumentProps";
import { cacheProxiedBody } from "../lib/snapshots";
import { navigateAnywhere } from "../lib/navigateAnywhere";
import "../../lib/turbolinks";

export default async function onRenderClient(
  pageContext: PageContextNoProxyClient
) {
  if (navigateAnywhere(pageContext.redirectTo)) return;

  const { Page, pageProps } = pageContext;
  const { Layout, layoutProps } = pageContext.config;

  if (!Page)
    throw new Error("Client-side render() hook expects Page to be exported");
  if (!Layout)
    throw new Error("Client-side render() hook expects Layout to be exported");

  document.removeEventListener("click", turbolinksClickListener);
  cacheProxiedBody();

  const { title = "", description = "" } = getDocumentProps(pageContext);
  document.title = title;
  document.head
    .querySelector("meta[name='description']")
    ?.setAttribute("content", description);

  const page = (
    <PageShell pageContext={pageContext}>
      <Layout {...layoutProps}>
        <Page {...pageProps} />
      </Layout>
    </PageShell>
  );

  renderReact(page, pageContext.isHydration);
}
