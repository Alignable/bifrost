import { Parser } from "htmlparser2";

export function extractDomElements(html: string): {
  bodyInnerHtml: string | null;
  headInnerHtml: string | null;
  bodyAttributes: Record<string, string>;
} {
  let headInnerHtml: string | null = null;
  let bodyInnerHtml: string | null = null;
  let bodyAttributes: Record<string, string> | null = null;

  let headStart = -1;
  let bodyStart = -1;

  const parser = new Parser({
    onopentag(name, attribs) {
      if (name === "head" && headStart < 0) {
        headStart = parser.endIndex! + 1;
      } else if (name === "body" && bodyStart < 0) {
        bodyStart = parser.endIndex! + 1;
        bodyAttributes = attribs;
      }
    },
    onclosetag(name) {
      if (name === "head" && headStart >= 0 && headInnerHtml === null) {
        headInnerHtml = html.slice(headStart, parser.startIndex!);
      } else if (name === "body" && bodyStart >= 0 && bodyInnerHtml === null) {
        bodyInnerHtml = html.slice(bodyStart, parser.startIndex!);
      }
    },
  });

  parser.write(html);
  parser.end();

  return { headInnerHtml, bodyInnerHtml, bodyAttributes: bodyAttributes ?? {} };
}
