import ReactDOMServer from "react-dom/server";
import React from "react";
import { PageShell } from "../lib/PageShell";
import { escapeInject, dangerouslySkipEscape } from "vite-plugin-ssr/server";
import { PageContextNoProxyServer } from "../types/internal";
import { getDocumentProps } from "./getDocumentProps";

export default async function onRenderHtml(
  pageContext: PageContextNoProxyServer
) {
  const { Page, pageProps } = pageContext;
  const { Layout, layoutProps } = pageContext.config;

  if (!Page)
    throw new Error("Server-side render() hook expects Page to be exported");
  if (!Layout)
    throw new Error("Server-side render() hook expects Layout to be exported");

  const pageHtml = ReactDOMServer.renderToString(
    <PageShell pageContext={pageContext}>
      <Layout {...layoutProps}>
        <Page {...pageProps} />
      </Layout>
    </PageShell>
  );

  // // See https://vite-plugin-ssr.com/head
  const { title = "", description = "" } = getDocumentProps(pageContext);
  if (!title) {
    console.warn(`No title set for ${pageContext.urlOriginal}!`);
  }

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
      <title>${title}</title>
      <meta name="title" property="og:title" content="${title}"/>
      <meta name="description" content="${description}"/>
      </head>
      <body>
        <div id="page-view">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vite-plugin-ssr.com/page-redirection
    },
  };
}
