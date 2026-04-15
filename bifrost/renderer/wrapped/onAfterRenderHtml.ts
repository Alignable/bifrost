import { PageContextServer } from "vike/types";
import { render } from "vike/abort";

export default function wrappedOnAfterRenderHtml(
  pageContext: PageContextServer
) {
  if (
    pageContext._wrappedServerOnly &&
    !pageContext._wrappedServerOnly.renderedBody
  ) {
    // We set wrapped serverOnly but we never rendered the body
    throw render(
      500,
      "proxied-body not found in DOM after SSR. This likely means the Layout threw during SSR (e.g. accessing `window` or `document`). Fix the SSR error in your Layout component."
    );
  }
}
