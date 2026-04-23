import { PageContextServer } from "vike/types";

export default function wrappedOnAfterRenderHtml(
  pageContext: PageContextServer
) {
  if (
    pageContext._wrappedServerOnly &&
    !pageContext._wrappedServerOnly.renderedBody
  ) {
    // We set wrapped serverOnly but we never rendered the body
    throw new Error(
      "proxied-body not found in DOM after SSR. This likely means the Layout threw during SSR (e.g. accessing `window` or `document`). Fix the SSR error in your Layout component."
    );
  }
}
