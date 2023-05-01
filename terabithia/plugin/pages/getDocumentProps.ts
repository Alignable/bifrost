import { PageContextNoProxy } from "terabithia-types";

export function getDocumentProps(pageContext: PageContextNoProxy) {
  return pageContext.config.documentProps || pageContext.documentProps || {};
}
