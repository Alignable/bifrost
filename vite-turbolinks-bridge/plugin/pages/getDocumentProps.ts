import { PageContextNoProxy } from "@vite-turbolinks-bridge/types";

export function getDocumentProps(pageContext: PageContextNoProxy) {
  return pageContext.config.documentProps || pageContext.documentProps || {};
}
