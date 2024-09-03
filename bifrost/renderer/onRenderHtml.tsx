import {
  PageContextNoProxyServer,
  PageContextProxyServer,
} from "../types/internal.js";
import { bifrostOnRenderHtml } from "./bifrost/onRenderHtml.js";
import { wrappedOnRenderHtml } from "./wrapped/onRenderHtml.js";

export default async function onRenderHtml(
  pageContext: PageContextNoProxyServer | PageContextProxyServer
) {
  if (pageContext.config.proxyMode === "wrapped") {
    return await wrappedOnRenderHtml(pageContext as PageContextProxyServer);
  } else if (pageContext.config.proxyMode === "passthru") {
    return {
      pageContext: {},
    };
  } else if (pageContext.config.proxyMode === false) {
    return await bifrostOnRenderHtml(pageContext as PageContextNoProxyServer);
  }
}
