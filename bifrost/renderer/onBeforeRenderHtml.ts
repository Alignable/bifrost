import { PageContextServer } from "vike/types";
import { wrappedOnBeforeRenderHtml } from "./wrapped/onBeforeRenderHtml";

export default function onBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.config.proxyMode === "wrapped") {
    wrappedOnBeforeRenderHtml(pageContext);
  }
}
