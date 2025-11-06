import { PageContextServer } from "vike/types";

export default function headHtmlEnd(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { head } = pageContext.wrappedServerOnly;
    return head.innerHTML;
  }
  return "";
}
