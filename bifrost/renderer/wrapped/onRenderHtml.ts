import { dangerouslySkipEscape } from "vike/server";
// @ts-ignore vike-react import typescript is wrong
import { onRenderHtml as vikeReactRender } from "vike-react/__internal/integration/onRenderHtml";
import { PageContextServer } from "vike/types";

const emptydocument = dangerouslySkipEscape("");
export default async function onRenderHtml(pageContext: PageContextServer) {
  if (pageContext._wrappedServerOnly) {
    return await vikeReactRender(pageContext);
  }
  return { documentHtml: emptydocument };
}
