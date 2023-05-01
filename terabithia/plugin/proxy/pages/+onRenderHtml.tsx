import React from "react";
import ReactDOMServer from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vite-plugin-ssr/server";
import { PageContextProxyServer } from "terabithia-types";
import { PageShell } from "../../lib/PageShell";

export default async function onRenderHtml(
  pageContext: PageContextProxyServer
) {
  if (pageContext.proxy) {
    const {
      proxy: { head, body, bodyAttrs },
      layoutProps,
      layout,
    } = pageContext;

    const Layout = pageContext.config.layouts[layout];
    if (!Layout) throw new Error(`${layout} layout not found`);
    const pageHtml = ReactDOMServer.renderToString(
      <PageShell pageContext={pageContext}>
        <Layout {...layoutProps}>
          <div id="proxied-body" dangerouslySetInnerHTML={{ __html: body }} />
        </Layout>
      </PageShell>
    );

    const documentHtml = escapeInject`
    <!DOCTYPE html>
    <html>
        <head>
          ${dangerouslySkipEscape(head)}
          ${
            // We need to fire turbolinks:load exactly on DCL, so it must be a blocking head script to catch DCL event.
            // Vite loads scripts with type="module" so the rest of our code will show up too late.
            // TODO: figure out how to bundle this better. at least read from a .js file
            dangerouslySkipEscape(`<script>
          addEventListener("DOMContentLoaded", () => {
            console.log("dcl")
            const event = new Event("turbolinks:load", { bubbles: true, cancelable: true });
            event.data = {url: window.location.href};
            document.dispatchEvent(event);  
          })
          </script>`)
          }
        </head>
        <body ${dangerouslySkipEscape(
          Object.entries(bodyAttrs)
            .map(([name, value]) => `${name}="${value}"`)
            .join(" ")
        )}>
          <div id="page-view">${dangerouslySkipEscape(pageHtml)}</div>
        </body>
    </html>`;

    return {
      documentHtml,
      pageContext: {},
    };
  } else {
    // do nothing: Just exists to signal fastify server that no routes matched and we should proxy
    return {};
  }
}
