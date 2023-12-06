import { PageContextNoProxyServer } from "../../../types/internal.js";

export default async function onRenderHtml(
  pageContext: PageContextNoProxyServer
) {
  return {
    pageContext: {},
  };
}
