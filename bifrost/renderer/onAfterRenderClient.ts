import {
  PageContextNoProxyClient,
  PageContextProxyClient,
} from "../types/internal.js";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { bifrostOnAfterRenderClient } from "./bifrost/onAfterRenderClient.js";
import { wrappedOnAfterRenderClient } from "./wrapped/onAfterRenderClient.js";

Turbolinks.start();

export default async function onAfterRenderClient(
  pageContext: PageContextNoProxyClient | PageContextProxyClient
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
