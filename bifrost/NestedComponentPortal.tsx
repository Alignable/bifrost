import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePageContext } from "vike-react/usePageContext";
import "./renderer/config";
import "./lib/type";

/**
 * Renders `children` into a legacy placeholder div (`<div data-bifrost-render="name">`)
 * inside the proxied body of a wrapped page.
 *
 * Server: marks the placeholder as claimed (so Page.tsx keeps it) and renders nothing —
 * the backend's server-side shell stays in the SSR HTML.
 * Client: portals `children` into the placeholder div, replacing the shell.
 *
 * Augment `Vike.NestedComponents` in userspace to type the allowed `name`s.
 */
export function NestedComponentPortal({
  name,
  children,
}: {
  name: keyof Vike.NestedComponents & string;
  children: React.ReactNode;
}) {
  const pageContext = usePageContext();
  const [target, setTarget] = useState<Element | null>(null);

  useLayoutEffect(() => {
    if (!pageContext.isClientSide) return;
    setTarget(
      document.querySelector(`#proxied-body [data-bifrost-render="${name}"]`)
    );
  }, [name, pageContext]); // re-query on client navigation (pageContext changes)

  if (!pageContext.isClientSide) {
    // Mark the placeholder claimed so Page.tsx keeps it instead of stripping.
    const entry = pageContext._wrappedServerOnly?.nestedComponents?.[name];
    if (entry) entry.rendered = true;
    return null;
  }

  return target ? createPortal(children, target) : null;
}

declare global {
  namespace Vike {
    interface NestedComponents {}
  }
}
