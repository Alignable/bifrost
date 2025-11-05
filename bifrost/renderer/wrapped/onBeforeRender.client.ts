import { PageContextClient } from "vike/types";
import { redirect } from "vike/abort";

// onBeforeRender runs before changing the browser location, so `throw redirect` works
// we wait for onBeforeRenderClient to call mergeHead, which runs after browser location change
export default async function wrappedOnBeforeRender(
  pageContext: PageContextClient
) {
  if (!pageContext?.snapshot && !pageContext.isHydration) {
    /*
    Mermaid diagram of client side navigation logic:

    Vike Router --> Proxy Mode
    Proxy Mode -->|wrapped| Request Legacy Backend
    Request Legacy Backend -->|redirect| Vike Router
    Request Legacy Backend -->|html| Render Wrapped Page
    Proxy Mode -->|false| Render Vike Page
    Proxy Mode -->|passthru| Browser Navigation

    ┌─────────────┐     ┌────────────┐         ┌────────────────────────┐      ┌─────────────────────┐
    │             │     │            │         │                        │      │                     │
    │ Vike Router ├────►│ Proxy Mode ├─wrapped►│ Request Legacy Backend ├html─►│ Render Wrapped Page │
    │             │     │            │         │                        │      │                     │
    └─────────────┘     └──────┬─────┘         └────────────┬───────────┘      └─────────────────────┘
           ▲                   │                        redirect                                      
           └───────────────────┼────────────────────────────┘                                         
                             false                                                                    
                               │               ┌────────────────────────┐                             
                               │               │                        │                             
                               ├──────────────►│    Render Vike Page    │                             
                           passthru            │                        │                             
                               │               └────────────────────────┘                             
                               │                                                                      
                               │               ┌────────────────────────┐                             
                               │               │                        │                             
                               └──────────────►│   Browser Navigation   │                             
                                               │                        │                             
                                               └────────────────────────┘                             

    The Vike router must run on every redirect, because the legacy backend could redirect to a Vike page.
    The browser follows redirects automatically, which hits the vike server, which will passthru if needed
    It would be more performant to run the Vike router on the client, but the browser does not expose redirect info.
    Optimization: use serviceworker to intercept redirects.
    */
    const resp = await fetch(pageContext.urlOriginal, {
      headers: { ...pageContext.config.proxyHeaders, accept: "text/html" },
    });

    if (resp.redirected) {
      const parsedUrl = new URL(resp.url);
      // Need to redirect to run vike router (in case redirect is not wrapped page)
      // Downside is we will make another network request
      // TODO: Can we prevent the double request? Move to server side and throw redirect on 3xx?
      if (window.location.origin === parsedUrl.origin) {
        // redirect needs to start with "/" or vike will do hard reload
        throw redirect(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash);
      } else {
        // external redirect
        throw redirect(resp.url);
      }
    }
    if (!resp.ok) {
      window.location.href = resp.url;
    }
    const html = await resp.text();
    const { layout, layoutProps } = pageContext.config.getLayout!(
      Object.fromEntries(resp.headers.entries())
    );
    if (!pageContext.config.layoutMap?.[layout]) {
      // Fallback to full reload if layout not found
      window.location.href = resp.url;
    }

    const parsed = document.createElement("html");
    parsed.innerHTML = html;
    const bodyEl = parsed.querySelector("body")!;
    const headEl = parsed.querySelector("head")!;
    pageContext.layout = layout;
    pageContext.layoutProps = layoutProps;
    pageContext._turbolinksProxy = {
      body: bodyEl,
      head: headEl,
    };
  }
}
