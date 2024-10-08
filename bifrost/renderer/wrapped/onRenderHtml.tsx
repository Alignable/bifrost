import React from "react";
import ReactDOMServer from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { PageContextProxyServer } from "../../types/internal.js";
import { PageShell } from "../../lib/PageShell.js";
import jsdom from "jsdom";
import { getElementAttributes } from "../../lib/getElementAttributes.js";

export async function wrappedOnRenderHtml(pageContext: PageContextProxyServer) {
  if (pageContext.wrappedServerOnly) {
    const { html, layoutProps, layout } = pageContext.wrappedServerOnly;

    const { layoutMap } = pageContext.config;
    if (!layoutMap) {
      throw new Error("layoutMap needs to be defined in config");
    }
    const Layout = layoutMap[layout];
    if (!Layout) {
      // passthru
      return { documentHtml: html, pageContext: {} };
    }

    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const bodyEl = doc.querySelector("body");
    const head = doc.querySelector("head");
    if (!bodyEl || !head) {
      throw new Error("Proxy failed");
    }

    const pageHtml = ReactDOMServer.renderToString(
      <PageShell pageContext={pageContext}>
        <Layout {...layoutProps}>
          <div
            id="proxied-body"
            dangerouslySetInnerHTML={{ __html: bodyEl.innerHTML }}
          />
        </Layout>
      </PageShell>
    );

    const documentHtml = escapeInject`
    <!DOCTYPE html>
    <html>
        <head>
          ${
            // We need to fire turbolinks:load exactly on DCL, so it must be a blocking head script to catch DCL event.
            // Vite loads scripts with type="module" so the rest of our code will show up too late.
            // TODO: figure out how to bundle this better. at least read from a .js file
            dangerouslySkipEscape(`<script>
          window.Turbolinks = {controller:{restorationIdentifier: ''},supported:true};
          addEventListener("DOMContentLoaded", () => {
            const event = new Event("turbolinks:load", { bubbles: true, cancelable: true });
            event.data = {url: window.location.href};
            document.dispatchEvent(event);  
          })
          </script>`)
          }
          ${dangerouslySkipEscape(head.innerHTML)}
        </head>
        <body ${dangerouslySkipEscape(
          Object.entries(getElementAttributes(bodyEl))
            .map(([name, value]) => `${name}="${value}"`)
            .join(" ")
        )}>
          <div id="page-view">${dangerouslySkipEscape(pageHtml)}</div>
        </body>
    </html>`;

    return {
      documentHtml,
      pageContext: { layout, layoutProps },
    };
  } else {
    // do nothing: Just exists to signal fastify server that no routes matched and we should proxy
    return {};
  }
}
