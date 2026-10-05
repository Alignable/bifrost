import "../../lib/type";
import type {} from "../config";
import type { PageContext, PageContextServer } from "vike/types";

/**
 * Waits for the backend page of a wrapped route and sets `_wrappedServerOnly`; resolves to whether the page is wrapped.
 * Vike runs an app's +onCreatePageContext before Bifrost's, so call this first in one that needs the wrapped page
 * or request state the backend response changes (e.g. via beforeWrappedRender).
 */
export async function loadWrappedPage(pageContext: PageContext) {
  const { _loadWrappedServerOnly } = pageContext as PageContextServer;
  if (_loadWrappedServerOnly) {
    const wrappedServerOnly = await _loadWrappedServerOnly(
      pageContext as PageContextServer
    );
    if (wrappedServerOnly)
      (pageContext as PageContextServer)._wrappedServerOnly = wrappedServerOnly;
  }
  return !!(pageContext as PageContextServer)._wrappedServerOnly;
}

// Also runs on the client, where it does nothing. A server-only hook would make Vike fetch pageContext.json on client navigation.
export default async function wrappedOnCreatePageContext(
  pageContext: PageContext
) {
  await loadWrappedPage(pageContext);
}
