import { PageContextProxyServer } from "../../types/internal";

// Indicates to VPS that this route requires a data fetch to grab pageContext
export default async function onBeforeRender(pageContext: PageContextProxyServer) {
  if (pageContext.proxy) {
    return { pageContext: {} };
  }
}
