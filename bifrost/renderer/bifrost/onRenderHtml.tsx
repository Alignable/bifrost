import React from "react";
import ReactDOMServer from "react-dom/server";
import { escapeInject, dangerouslySkipEscape } from "vike/server";
import { PageShell } from "../../lib/PageShell";
import { PageContextNoProxyServer } from "../../types/internal";
import { documentPropsToReact } from "../utils/buildHead";
import { getPageContextOrConfig } from "../utils/getConfigOrPageContext";

export async function bifrostOnRenderHtml(
  pageContext: PageContextNoProxyServer
) {
  const { Page, pageProps, redirectTo } = pageContext;
  if (redirectTo) {
    return {
      pageContext: {
        redirectTo,
      },
    };
  }
  const { Layout } = pageContext.config;
  const layoutProps = getPageContextOrConfig(pageContext, "layoutProps") || {};

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

  const headHtml = ReactDOMServer.renderToString(
    documentPropsToReact(
      getPageContextOrConfig(pageContext, "documentProps") || {}
    )
  );

  const bodyAttrs = getPageContextOrConfig(pageContext, "bodyAttrs") || [];

  const { favicon } = pageContext.config;
  const faviconTag = !favicon
    ? ""
    : escapeInject`<link rel="icon" href="${favicon}" />`;

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
      ${faviconTag}
      ${dangerouslySkipEscape(headHtml)}
      ${dangerouslySkipEscape(
        (pageContext.config.scripts || []).flatMap((s) => s).join("")
      )}
      ${dangerouslySkipEscape(
        (pageContext.config.dynamicScripts || [])
          .map((s) => s(pageContext))
          .join("")
      )}
      ${dangerouslySkipEscape(`<script>
      window.Turbolinks = {controller:{restorationIdentifier: ''}};
      addEventListener("DOMContentLoaded", () => {
        const event = new Event("turbolinks:load", { bubbles: true, cancelable: true });
        event.data = {url: window.location.href};
        document.dispatchEvent(event);  
      })
      </script>`)}
      </head>
      <body ${dangerouslySkipEscape(
        bodyAttrs.map(({ name, value }) => `${name}="${value}"`).join(" ")
      )}>
        <div id="page-view">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vike.com/page-redirection
    },
  };
}
