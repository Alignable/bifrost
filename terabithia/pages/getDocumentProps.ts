import { PageContextNoProxy } from "../types/internal";

export function getDocumentProps(pageContext: PageContextNoProxy) {
  return pageContext.config.documentProps || pageContext.documentProps || {};
}
