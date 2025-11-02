import {
  PageContextNoProxyClient,
  PageContextProxyClient,
} from "../types/internal.js";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { bifrostOnBeforeRenderClient } from "./bifrost/onBeforeRenderClient";
import { wrappedOnBeforeRenderClient } from "./wrapped/onBeforeRenderClient";

Turbolinks.start();

export default async function onBeforeRenderClient(
  pageContext: PageContextNoProxyClient | PageContextProxyClient
) {
  if ("redirectTo" in pageContext && pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }
  if (pageContext.config.proxyMode === "wrapped") {
    return await wrappedOnBeforeRenderClient(pageContext);
  } else if (pageContext.config.proxyMode === false) {
    return await bifrostOnBeforeRenderClient(pageContext);
  }
}
