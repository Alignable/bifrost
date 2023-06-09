import { PageContextProxyServer } from "../../types/internal.js";

// Indicates to VPS that this route requires a data fetch to grab pageContext
export default async function onBeforeRender(pageContext: PageContextProxyServer) {
  if (pageContext.proxy) {
    return { pageContext: {} };
  }
}
