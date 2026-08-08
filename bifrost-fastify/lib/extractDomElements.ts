import { Parser } from "htmlparser2";

/**
 * A `<div data-bifrost-render="name">` placeholder found in the proxied body:
 * its byte range within bodyInnerHtml and whether a NestedComponentPortal claimed it
 * during SSR (`rendered`, set later during React render).
 */
export interface NestedComponent {
  start: number;
  end: number;
  rendered?: boolean;
}

export function extractDomElements(html: string): {
  bodyInnerHtml: string | null;
  headInnerHtml: string | null;
  bodyAttributes: Record<string, string>;
  nestedComponents: Record<string, NestedComponent>;
} {
  let headInnerHtml: string | null = null;
  let bodyInnerHtml: string | null = null;
  let bodyAttributes: Record<string, string> | null = null;
  // Ranges relative to the raw html; rebased onto bodyInnerHtml before returning.
  const nestedComponents: Record<string, NestedComponent> = {};

  let headStart = -1;
  let bodyStart = -1;

  // div nesting depth counter; when a tagged div opens we remember its name+start
  // and the depth at which to match its close.
  let divDepth = 0;
  const openTemplates: { name: string; start: number; depth: number }[] = [];

  const parser = new Parser({
    onopentag(name, attribs) {
      if (name === "head" && headStart < 0) {
        headStart = parser.endIndex! + 1;
      } else if (name === "body" && bodyStart < 0) {
        bodyStart = parser.endIndex! + 1;
        bodyAttributes = attribs;
      } else if (name === "div") {
        divDepth++;
        const template = attribs["data-bifrost-render"];
        if (template) {
          openTemplates.push({
            name: template,
            start: parser.startIndex!,
            depth: divDepth,
          });
        }
      }
    },
    onclosetag(name) {
      if (name === "head" && headStart >= 0 && headInnerHtml === null) {
        headInnerHtml = html.slice(headStart, parser.startIndex!);
      } else if (name === "body" && bodyStart >= 0 && bodyInnerHtml === null) {
        bodyInnerHtml = html.slice(bodyStart, parser.startIndex!);
      } else if (name === "div") {
        const top = openTemplates[openTemplates.length - 1];
        if (top && top.depth === divDepth) {
          openTemplates.pop();
          // ponytail: last occurrence wins if a name repeats; single use expected.
          nestedComponents[top.name] = {
            start: top.start,
            end: parser.endIndex! + 1,
          };
        }
        divDepth--;
      }
    },
  });

  parser.write(html);
  parser.end();

  // Rebase ranges from raw-html offsets onto bodyInnerHtml offsets.
  if (bodyStart >= 0) {
    for (const range of Object.values(nestedComponents)) {
      range.start -= bodyStart;
      range.end -= bodyStart;
    }
  }

  return {
    headInnerHtml,
    bodyInnerHtml,
    bodyAttributes: bodyAttributes ?? {},
    nestedComponents,
  };
}
