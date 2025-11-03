import { PageContextClient } from "vike/types";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { bifrostOnAfterRenderClient } from "./bifrost/onAfterRenderClient";
import { wrappedOnAfterRenderClient } from "./wrapped/onAfterRenderClient";

export default async function onAfterRenderClient(
  pageContext: PageContextClient
) {
  if ("redirectTo" in pageContext && pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }
  if (pageContext.config.proxyMode === "wrapped") {
    return await wrappedOnAfterRenderClient(pageContext);
  } else if (pageContext.config.proxyMode === false) {
    return await bifrostOnAfterRenderClient(pageContext);
  }
}
