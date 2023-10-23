import type { PageContextBuiltIn } from "vike/types";

const ROUTES = ["/this-is-a-custom-route"];
export default function route(pageContext: PageContextBuiltIn) {
  return ROUTES.includes(pageContext.urlPathname);
}
