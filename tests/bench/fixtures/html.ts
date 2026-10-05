export type Attrs = Record<string, string | number | boolean | undefined>;
export type Child = string | false | null | undefined | Child[];

const VOID = new Set(
  "area base br col embed hr img input link meta source track wbr".split(" ")
);

export function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): string {
  let open = `<${tag}`;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    open += value === true ? ` ${key}` : ` ${key}="${escapeAttr(String(value))}"`;
  }
  if (VOID.has(tag)) return `${open} />`;
  return `${open}>${flatten(children)}</${tag}>`;
}

function flatten(children: Child[]): string {
  let out = "";
  for (const child of children) {
    if (Array.isArray(child)) out += flatten(child);
    else if (child) out += child;
  }
  return out;
}

/** Wraps `inner` in `depth` nested divs, mimicking component wrapper soup. */
export function nest(depth: number, classes: () => string, inner: Child): string {
  let out = flatten([inner]);
  for (let i = 0; i < depth; i++) out = h("div", { class: classes() }, out);
  return out;
}
