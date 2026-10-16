import { dangerouslySkipEscape } from "vike/server";
// @ts-ignore vike-react import typescript is wrong
import { onRenderHtml as vikeReactRender } from "vike-react/__internal/integration/onRenderHtml";
import { PageContextServer } from "vike/types";

const emptydocument = dangerouslySkipEscape("");
// The return type is spelled out: inferred, it would point into vike's internals, which the declaration build rejects
export default async function onRenderHtml(
  pageContext: PageContextServer
): Promise<
  Awaited<ReturnType<typeof vikeReactRender>> | { documentHtml: typeof emptydocument }
> {
  if (pageContext._wrappedServerOnly) {
    return await vikeReactRender(pageContext);
  }
  return { documentHtml: emptydocument };
}
