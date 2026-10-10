import { type Snapshot } from "../lib/turbolinks/controller";
import { type Visit } from "./turbolinks/visit";
// Internal types used only within bifrost. Public types go in renderer/config.ts

export interface WrappedServerOnly {
  bodyAttributes: Record<string, string>;
  bodyInnerHtml: string;
  headInnerHtml: string;
  // layoutinfo CANNOT be in pageContextInit as that will force Vike to make pageContext.json requests
  // https://vike.dev/pageContext.json#avoid-pagecontext-json-requests
  // Instead, we nest them inside wrappedServerOnly and move them to top-level pageContext in onBeforeRenderHtml
  proxyLayoutInfo: Vike.ProxyLayoutInfo;
  // Marker to verify that render succeeded
  renderedBody?: boolean;
  // Placeholder divs (`<div data-bifrost-render="name">`) found in the proxied body:
  // their byte range within bodyInnerHtml (set by extractDomElements) and whether a
  // NestedComponentPortal claimed each one during React render (`rendered`). Page.tsx
  // strips any entry left unrendered. Optional: older bifrost-fastify versions don't send it.
  nestedComponents?: Record<
    string,
    { start: number; end: number; rendered?: boolean }
  >;
}

declare global {
  namespace Vike {
    interface PageContext {
      _turbolinksProxy?: {
        body: HTMLElement;
        bodyAttrs?: Record<string, string>;
        head?: HTMLHeadElement;
      };
    }
    interface PageContextServer {
      _wrappedServerOnly?: WrappedServerOnly;
    }
    interface PageContextClient {
      _snapshot?: Snapshot;
      _waitForHeadScripts?: () => Promise<void>;
      _turbolinksVisit?: Visit;
      _shouldEmitBeforeRender?: boolean;
      _reactRenderTimeout?: NodeJS.Timeout;
    }
  }
}
