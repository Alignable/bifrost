import { type Snapshot } from "../lib/turbolinks/controller";
// Internal types used only within bifrost. Public types go in renderer/config.ts

export interface WrappedServerOnly {
  bodyAttributes: Record<string, string>;
  bodyInnerHtml: string;
  headInnerHtml: string;
  // layoutinfo CANNOT be in pageContextInit as that will force Vike to make pageContext.json requests
  // https://vike.dev/pageContext.json#avoid-pagecontext-json-requests
  // Instead, we nest them inside wrappedServerOnly and move them to top-level pageContext in onBeforeRenderHtml
  proxyLayoutInfo: Vike.ProxyLayoutInfo;
}

declare global {
  namespace Vike {
    interface PageContext {
      _turbolinksProxy?: {
        body: HTMLElement;
        head?: HTMLHeadElement;
      };
    }
    interface PageContextServer {
      _wrappedServerOnly?: WrappedServerOnly;
    }
    interface PageContextClient {
      _snapshot?: Snapshot;
      _waitForHeadScripts?: () => Promise<void>;
    }
  }
}
