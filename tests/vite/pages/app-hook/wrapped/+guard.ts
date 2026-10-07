import { redirect } from "vike/abort";
import type { PageContext, PageContextServer } from "vike/types";

// Runs after Bifrost has the backend's response. X-TEST-GUARD-REDIRECT makes it redirect.
export default function guard(pageContext: PageContext) {
  if ((pageContext as PageContextServer).headers?.["x-test-guard-redirect"])
    throw redirect("/vite-page");
}
