import { ReactNode } from "react";
import { Root, createRoot, hydrateRoot } from "react-dom/client";

let root: Root;

export function renderReact(page: ReactNode, isHydration: boolean) {
  let container = document.getElementById("root")!;
  if (!container) {
    container = document.createElement("div");
    container.id = "root";
    document.body.appendChild(container);
  }
  if (isHydration) {
    root = hydrateRoot(container, page);
  } else {
    if (!root) {
      root = createRoot(container);
    }
    root.render(page);
  }
}
