import { PageContextBuiltIn } from "vite-plugin-ssr/types";

const paths = ["/custom", "/custom-bifrost"];

export default function route(pageContext: PageContextBuiltIn) {
  return paths.includes(pageContext.urlPathname);
}
