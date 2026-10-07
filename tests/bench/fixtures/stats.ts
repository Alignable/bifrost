import { Parser } from "htmlparser2";

const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));

/** Shape metrics used to keep fixtures comparable to the production pages they model. */
export function htmlStats(html: string) {
  let depth = 0;
  let maxDepth = 0;
  let elements = 0;
  let attrBytes = 0;
  let inlineScriptBytes = 0;
  let inScript = false;
  let headBytes = 0;
  let headStart = -1;
  const tags: Record<string, number> = {};
  const parser = new Parser({
    onopentag(name, attrs) {
      elements++;
      tags[name] = (tags[name] ?? 0) + 1;
      for (const [k, v] of Object.entries(attrs)) attrBytes += k.length + v.length;
      if (name === "script" && !attrs.src) inScript = true;
      if (name === "head") headStart = parser.startIndex;
      if (!VOID.has(name)) maxDepth = Math.max(maxDepth, ++depth);
    },
    onclosetag(name) {
      if (!VOID.has(name)) depth--;
      if (name === "script") inScript = false;
      if (name === "head") headBytes = parser.endIndex - headStart;
    },
    ontext(text) {
      if (inScript) inlineScriptBytes += text.length;
    },
  });
  parser.write(html);
  parser.end();
  return {
    bytes: Buffer.byteLength(html),
    headBytes,
    elements,
    maxDepth,
    attrBytes,
    inlineScriptBytes,
    scripts: tags.script ?? 0,
    svgs: tags.svg ?? 0,
    links: tags.a ?? 0,
  };
}
