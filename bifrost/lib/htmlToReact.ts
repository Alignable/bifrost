import React from "react";

function convertToReactProps(element: Element): Record<string, any> {
  const reactProps: Record<string, any> = {};

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    let propName = attr.name;
    let propValue: any = attr.value;

    // Convert HTML attributes to React props
    if (propName === "class") {
      propName = "className";
    } else if (propName === "for") {
      propName = "htmlFor";
    } else if (propName.includes("-")) {
      // Keep data- and aria- attributes as-is
      if (!propName.startsWith("data-") && !propName.startsWith("aria-")) {
        // Convert kebab-case to camelCase
        propName = propName.replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase()
        );
      }
    }

    // Handle boolean attributes - empty string means the attribute is present
    if (
      propValue === "" &&
      (propName === "checked" ||
        propName === "selected" ||
        propName === "disabled" ||
        propName === "multiple" ||
        propName === "defer" ||
        propName === "async" ||
        propName === "autoplay" ||
        propName === "controls" ||
        propName === "hidden" ||
        propName === "loop" ||
        propName === "muted" ||
        propName === "readonly" ||
        propName === "required" ||
        propName === "reversed" ||
        propName === "open")
    ) {
      propValue = true;
    }

    reactProps[propName] = propValue;
  }

  return reactProps;
}

function domNodeToReact(node: Node): React.ReactNode {
  // Text node
  if (node.nodeType === 3) {
    return node.textContent;
  }

  // Element node
  if (node.nodeType === 1) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const props = convertToReactProps(element);

    // Convert child nodes
    const children: React.ReactNode[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = domNodeToReact(element.childNodes[i]);
      if (child !== null && child !== undefined && child !== "") {
        children.push(child);
      }
    }

    return React.createElement(
      tagName,
      Object.keys(props).length > 0 ? props : null,
      ...children
    );
  }

  // Skip other node types (comments, etc.)
  return null;
}

// Converts a JSDOM Element to a React component
// Used for converting HTML head parsed from proxied server into Head component usable by vike-react
// TODO: Feature request to vike-react to support raw HTML head injection
// TODO: benchmark performance
export function jsdomToReactComponent(element: Element): React.ReactElement {
  const reactElement = domNodeToReact(element);

  if (React.isValidElement(reactElement)) {
    return reactElement;
  }

  throw new Error("Failed to convert JSDOM element to React component");
}
