import { redirect } from "vike/abort";
import { PageContextServer } from "vike/types";

export default function guard(pageContext: PageContextServer) {
  throw redirect(pageContext.urlParsed.search["redirectTo"] || "/");
}
