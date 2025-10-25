import { dangerouslySkipEscape } from "vike/server";
import {
  PageContextNoProxyServer,
  PageContextProxyServer,
} from "../types/internal.js";
import { bifrostOnRenderHtml } from "./bifrost/onRenderHtml";
import { wrappedOnRenderHtml } from "./wrapped/onRenderHtml";

export default async function onRenderHtml(
  pageContext: PageContextNoProxyServer | PageContextProxyServer
) {
  switch (pageContext.config.proxyMode) {
    case "wrapped":
      return await wrappedOnRenderHtml(pageContext as PageContextProxyServer);
    case "passthru":
      return {
        documentHtml: dangerouslySkipEscape(""),
      };
    default:
      return await bifrostOnRenderHtml(pageContext as PageContextNoProxyServer);
  }
}
