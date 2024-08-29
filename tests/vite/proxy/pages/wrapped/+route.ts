import { PageContextServer } from "vike/types";

const paths = ["/custom", "/custom-bifrost", "/json-route"];

export default function route(pageContext: PageContextServer) {
  return paths.includes(pageContext.urlPathname);
}
