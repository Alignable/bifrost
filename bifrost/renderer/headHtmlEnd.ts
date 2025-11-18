import { PageContextServer } from "vike/types";
import "../lib/type";

export default function headHtmlEnd(pageContext: PageContextServer) {
  return pageContext._wrappedServerOnly?.headInnerHtml || "";
}
