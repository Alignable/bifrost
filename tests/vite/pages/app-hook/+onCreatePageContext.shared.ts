import { loadWrappedPage } from "@alignable/bifrost";
import type { PageContext, PageContextServer } from "vike/types";

// Like Alignable's app hook, which Vike runs concurrently with Bifrost's. X-TEST-LOAD-WRAPPED-PAGE makes it await
// loadWrappedPage.
export default async function onCreatePageContext(pageContext: PageContext) {
  if (pageContext.isClientSide) return;
  if ((pageContext as PageContextServer).headers?.["x-test-load-wrapped-page"])
    await loadWrappedPage(pageContext);
  pageContext.appHookSawWrappedPage = !!(pageContext as PageContextServer)
    ._wrappedServerOnly;
}
