import type { Turbolinks } from ".";

declare global {
  interface Node {
    // https://github.com/Microsoft/TypeScript/issues/283
    cloneNode(deep?: boolean): this;
  }

  interface Window {
    Turbolinks: Turbolinks;
  }
}
