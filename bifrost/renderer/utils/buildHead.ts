import { PageContextNoProxy } from "../../types/internal";
import { getDocumentProps } from "../getDocumentProps";
import { formatMetaObject } from "./formatMetaObject";

const noop = (
  strings: TemplateStringsArray,
  ...expressions: unknown[]
): string => {
  let result = strings[0];

  for (let i = 1, l = strings.length; i < l; i++) {
    result += expressions[i - 1];
    result += strings[i];
  }

  return result;
};

export function buildHead(
  pageContext: PageContextNoProxy,
  escapeInject: any = noop,
  dangerouslySkipEscape: (alreadyEscaped: string) => any = (s) => s
) {
  const thirdPartyScripts = Object.values(
    pageContext.config.scripts || {}
  ).join("");

  // // See https://vite-plugin-ssr.com/head
  const {
    title = "",
    description = "",
    viewport,
  } = getDocumentProps(pageContext);
  if (!title) {
    console.warn(`No title set for ${pageContext.urlOriginal}!`);
  }

  const viewportTag = !viewport
    ? ""
    : `<meta content="${formatMetaObject(viewport)}" name="viewport">`;

  return escapeInject`${dangerouslySkipEscape(thirdPartyScripts)}
    <title>${title}</title>
    <meta name="title" property="og:title" content="${title}"/>
    <meta name="description" content="${description}"/>
    ${dangerouslySkipEscape(viewportTag)}`;
}
