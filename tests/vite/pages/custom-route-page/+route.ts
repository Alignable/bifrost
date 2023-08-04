import type { PageContextBuiltIn } from "vite-plugin-ssr/types";

const ROUTES = ["/this-is-a-custom-route"];
export default function route(pageContext: PageContextBuiltIn) {
  return ROUTES.includes(pageContext.urlPathname);
}
