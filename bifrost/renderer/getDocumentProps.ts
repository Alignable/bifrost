import { DocumentProps, PageContextNoProxy } from "../types/internal.js";

export function getDocumentProps(pageContext: PageContextNoProxy): DocumentProps {
  return pageContext.config.documentProps || pageContext.documentProps || {};
}
