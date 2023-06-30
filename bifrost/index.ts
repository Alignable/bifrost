import { PageContextBuiltIn } from "vite-plugin-ssr/types";
import { AppSpecificPageContextInit, PageContextNoProxy } from "./types/internal";

export type {
  DocumentProps,
  LayoutMap,
  NoProxyConfig as BifrostConfig,
  ProxyConfig as BifrostProxyConfig,
  AppSpecificPageContextInit,
  PageContext,
} from "./types/internal";
export { usePageContext } from "./renderer/usePageContext.js";

type OptionalPromise<T> = Promise<T> | T;
export type OnBeforeRender = (
  pageContext: PageContextBuiltIn & AppSpecificPageContextInit
) => OptionalPromise<{
  pageContext: Partial<PageContextNoProxy>;
}>;
