import {
  PageContextNoProxyClient,
  PageContextProxyClient,
} from "../types/internal.js";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { wrappedOnRenderClient } from "./wrapped/onRenderClient.js";
import { bifrostOnRenderClient } from "./bifrost/onRenderClient.js";

Turbolinks.start();

export default async function onRenderClient(
  pageContext: PageContextNoProxyClient | PageContextProxyClient
) {
  if ("redirectTo" in pageContext && pageContext.redirectTo) {
    Turbolinks.visit(pageContext.redirectTo);
    return;
  }
  if (pageContext.config.proxyMode === "wrapped") {
    return await wrappedOnRenderClient(pageContext as PageContextProxyClient);
  } else if (pageContext.config.proxyMode === false) {
    return await bifrostOnRenderClient(pageContext as PageContextNoProxyClient);
  }
}
