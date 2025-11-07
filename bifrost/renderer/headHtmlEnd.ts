import { PageContextServer } from "vike/types";

export default function headHtmlEnd(pageContext: PageContextServer) {
  return pageContext.wrappedServerOnly?.headInnerHtml || "";
}
