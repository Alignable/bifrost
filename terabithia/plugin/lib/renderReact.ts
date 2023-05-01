import { ReactNode } from "react";
import { Root, createRoot, hydrateRoot } from "react-dom/client";

let root: Root;

export function renderReact(page: ReactNode, isHydration: boolean) {
  const container = document.getElementById("page-view")!;
  if (isHydration) {
    root = hydrateRoot(container, page);
  } else {
    if (!root) {
      root = createRoot(container);
    }
    root.render(page);
  }
}
