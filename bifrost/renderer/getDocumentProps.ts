import { PageContextNoProxy } from "../types/internal.js";

export function getDocumentProps(pageContext: PageContextNoProxy) {
  return pageContext.config.documentProps || pageContext.documentProps || {};
}
