import "../../lib/type";
import type {} from "../config";
import { render } from "vike/abort";
import type { PageContext, PageContextServer } from "vike/types";

/**
 * Waits for the backend's page on a wrapped route and adds it to pageContext; resolves to whether the page is wrapped.
 * Vike runs +onCreatePageContext hooks concurrently, so an app hook that needs the wrapped page should await this.
 * If an app has other +onCreatePageContext hooks and none awaits it, Bifrost renders the page again once the backend responds.
 */
export async function loadWrappedPage(pageContext: PageContext) {
  const pc = pageContext as PageContextServer;
  const wrap = pc._bifrostWrap;
  if (wrap && !pc._wrappedServerOnly && pc.config.proxyMode === "wrapped") {
    wrap.awaited = true;
    const page = await wrap.load(pc);
    if (page) Object.assign(pc, page);
  }
  return !!pc._wrappedServerOnly;
}

// Also runs on the client, where it does nothing. A server-only hook would make Vike fetch pageContext.json on client navigation.
export default async function wrappedOnCreatePageContext(
  pageContext: PageContext
) {
  const pc = pageContext as PageContextServer;
  const wrap = pc._bifrostWrap;
  if (!wrap || pc._wrappedServerOnly) return;
  const page = await wrap.load(pc);
  if (!page) return;
  const hooks: unknown = pc.config.onCreatePageContext;
  const onlyBifrostHook = Array.isArray(hooks) && hooks.length === 1;
  if (onlyBifrostHook || wrap.awaited) {
    Object.assign(pc, page);
    return;
  }
  // The app's hooks ran alongside this one without the backend's page. Render again with onBeforeRoute adding it first.
  // Keeping abortReason keeps a `throw render(url, { proxy: "wrapped" })` route from re-running the page that threw it.
  wrap.page = page;
  throw render(
    pc.urlParsed.href as `/${string}`,
    pc.abortReason as {} | undefined
  );
}
