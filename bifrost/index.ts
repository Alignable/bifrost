export type {
  Config,
  Meta,
  GuardAsync,
  GuardSync,
  OnBeforePrerenderStartAsync,
  OnBeforePrerenderStartSync,
  OnBeforeRenderAsync,
  OnBeforeRenderSync,
  OnBeforeRouteAsync,
  OnBeforeRouteSync,
  OnHydrationEndAsync,
  OnHydrationEndSync,
  OnPageTransitionEndAsync,
  OnPageTransitionEndSync,
  OnPageTransitionStartAsync,
  OnPageTransitionStartSync,
  OnPrerenderStartAsync,
  OnPrerenderStartSync,
  OnRenderClientAsync,
  OnRenderClientSync,
  OnRenderHtmlAsync,
  OnRenderHtmlSync,
  RouteAsync,
  RouteSync,
} from "vike/types";
import { navigate as vikeNavigate } from "vike/client/router";
import type {
  ApplicationFacingPageContext,
  AugmentMe,
} from "./types/internal.js";

export type {
  DocumentProps,
  LayoutMap,
  NoProxyConfig as BifrostConfig,
  ProxyConfig as BifrostProxyConfig,
  LayoutComponent,
  AugmentMe,
  PageContext,
} from "./types/internal";
export {
  usePageContext,
  PageContextProvider,
} from "./renderer/usePageContext.js";
export { useNavigation } from "./renderer/useNavigation.js";

export const navigate: typeof vikeNavigate = async (url, opts) => {
  window.Turbolinks.visit(url, {
    action: opts?.overwriteLastHistoryEntry ? "replace" : "advance",
  });
  if (window.Turbolinks.controller.currentVisit?.state === "started") {
    return new Promise((resolve) => {
      window.document.addEventListener("turbolinks:load", (ev) => resolve());
    });
  }
};

declare global {
  namespace Vike {
    interface PageContext
      extends ApplicationFacingPageContext,
        AugmentMe.PageContextInit {}
  }
}
