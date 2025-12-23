export function getElementAttributes(element: Element) {
  const bodyAttrs: Record<string, string> = {};
  element.getAttributeNames().forEach((name) => {
    bodyAttrs[name] = element.getAttribute(name)!;
  });
  return bodyAttrs;
}

/**
 * clears attributes on document body and sets new ones
 * @param attrs attributes to set on body
 */
export function setBodyAttributes(
  attrs: Record<string, string | number | boolean | null | undefined>
) {
  document.body
    .getAttributeNames()
    .forEach((n) => document.body.removeAttribute(n));
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== false && value !== null && value !== undefined) {
      document.body.setAttribute(name, String(value));
    }
  }
}
