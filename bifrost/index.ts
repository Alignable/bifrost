import { PageContextBuiltInServer } from "vike/types";
import { AugmentMe, PageContextNoProxy } from "./types/internal.js";

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

type OptionalPromise<T> = Promise<T> | T;
export type OnBeforeRender = (
  pageContext: PageContextBuiltInServer & AugmentMe.PageContextInit
) => OptionalPromise<{
  pageContext: Partial<PageContextNoProxy>;
}>;
