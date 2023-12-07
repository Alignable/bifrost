import { PageContextBuiltIn } from "vike/types";

const paths = ["/custom", "/custom-bifrost", "/json-route"];

export default function route(pageContext: PageContextBuiltIn) {
  return paths.includes(pageContext.urlPathname);
}
