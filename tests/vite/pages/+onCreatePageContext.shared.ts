import { loadWrappedPage } from "@alignable/bifrost";
import type { PageContext, PageContextServer } from "vike/types";

// Like Alignable's app hook, which Vike runs before Bifrost's own. Opt-in per request so other tests still cover
// Bifrost's hook alone.
export default async function onCreatePageContext(pageContext: PageContext) {
  if (pageContext.isClientSide || pageContext.config.proxyMode !== "wrapped")
    return;
  if (!(pageContext as PageContextServer).headers?.["x-test-app-hook"]) return;
  pageContext.appHookSawWrappedPage = await loadWrappedPage(pageContext);
}
