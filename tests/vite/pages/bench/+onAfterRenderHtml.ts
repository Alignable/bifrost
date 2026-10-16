import { PageContextServer } from "vike/types";
import { layoutCms } from "../../../bench/fixtures/layoutCms";

// Mirrors the app dehydrating its query/relay stores into pageContext after SSR.
export default function onAfterRenderHtml(pageContext: PageContextServer) {
  pageContext.benchSsrState = layoutCms.ssrState;
}
