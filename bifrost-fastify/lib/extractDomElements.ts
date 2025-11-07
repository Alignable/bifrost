import { Parser } from "htmlparser2";
import { DomHandler, type Element } from "domhandler";
import { findOne } from "domutils";
import render from "dom-serializer";

function getInnerHtml(element: Element): string {
  return element.children.map((c) => render(c)).join("");
}

export function extractDomElements(html: string): {
  bodyInnerHtml: string | null;
  headInnerHtml: string | null;
  bodyAttributes: Record<string, string>;
} {
  let bodyInnerHtml: string | null = null;
  let headInnerHtml: string | null = null;
  let bodyAttributes: Record<string, string> = {};
  const handler = new DomHandler((error, dom) => {
    if (!error) {
      const body = findOne((elem) => elem.name === "body", dom);
      const head = findOne((elem) => elem.name === "head", dom);
      if (body && head) {
        bodyAttributes = body.attribs;
        bodyInnerHtml = getInnerHtml(body);
        headInnerHtml = getInnerHtml(head);
      }
    }
  });
  const parser = new Parser(handler);
  parser.write(html);
  parser.end();
  return { bodyInnerHtml, headInnerHtml, bodyAttributes };
}
