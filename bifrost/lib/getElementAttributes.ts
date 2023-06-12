export function getElementAttributes(element: Element) {
  const bodyAttrs: Record<string, string> = {};
  element.getAttributeNames().forEach((name) => {
    bodyAttrs[name] = element.getAttribute(name)!;
  });
  return bodyAttrs;
}
