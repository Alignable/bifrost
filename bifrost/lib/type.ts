import { type Snapshot } from "../lib/turbolinks/controller";
import { type Visit } from "./turbolinks/visit";
import type { PageContextServer } from "vike/types";
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
}

/** pageContext additions for rendering a wrapped page */
export type WrappedPage = Partial<Vike.PageContextServer> & {
  _wrappedServerOnly: WrappedServerOnly;
};

/** Set by createBifrostHandler (@alignable/bifrost/server), and shared by every render of the request */
export interface BifrostWrap {
  /** Requests the backend once per request; resolves to the page to wrap, or null to send the backend's response as-is */
  load: (pageContext: PageContextServer) => Promise<WrappedPage | null>;
  /** Whether an app hook awaited loadWrappedPage, so it saw the backend's page */
  awaited?: boolean;
  /** Set when Bifrost renders again with the backend's page; onBeforeRoute adds it to the new render */
  page?: WrappedPage;
  /** The last pageContext a hook received, set by Bifrost's +onHookCall: the final render's, which Vike's page handler doesn't return */
  pageContext?: PageContextServer;
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
      _bifrostWrap?: BifrostWrap;
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
