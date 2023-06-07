import { PropsWithChildren } from "react";
import {
  Config,
  ConfigNonHeaderFile,
  PageContextBuiltIn,
  PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient,
} from "vite-plugin-ssr/types";
import InternalProxyConfig from "../proxy/pages/+config.js";
import InternalNoProxyConfig from "../renderer/+config.js";

// Utility type to ensure exported type matches meta defined in library
type ConfigConstructor<
  LibConfig extends ConfigNonHeaderFile,
  T extends { [K in keyof LibConfig["meta"]]: any }
> = Config & Partial<T>;

// =============== Types for proxy pages ================= //
// ===============  Crossing the bridge  ================ //
// export interface Proxy {
//   body: string;
//   head: string;
//   bodyAttrs: Record<string, string>;
// }

export type Layout<LayoutProps> = React.ComponentType<
  PropsWithChildren<LayoutProps>
>;
export type LayoutMap<LayoutProps> = Record<string, Layout<LayoutProps>>;

export type ProxyConfig<LayoutProps> = ConfigConstructor<
  typeof InternalProxyConfig,
  {
    layoutMap: LayoutMap<LayoutProps>;
  }
>;

type PageContextProxyCommon<LayoutProps = Record<string, unknown>> = {
  /// Which layout to render
  layout: string;
  /// Props to pass down to layout component. Proxied server should send this
  layoutProps: LayoutProps;
  config: ProxyConfig<LayoutProps>;
};

type PageContextProxyClientHydration = {
  isHydration: true;
  redirectTo?: string;
};

type PageContextProxyClientNav = {
  isHydration: false;
  redirectTo?: string;
  /// same as proxy but is allowed to be sent to client.
  /// Should not exist on initial render since it'll double page size!!
  proxySendClient?: string;
};
export type PageContextProxyServer = PageContextBuiltIn<Page> &
  PageContextProxyCommon & { proxy: string };
export type PageContextProxyClient = PageContextBuiltInClient<Page> &
  PageContextProxyCommon &
  (PageContextProxyClientHydration | PageContextProxyClientNav);

export type PageContextProxy = PageContextProxyServer | PageContextProxyClient;

export type PageContextProxyRestorationVisit =
  PageContextBuiltInClient<Page> & {
    bodyEl: Element;
    headEl: HTMLHeadElement;
  } & PageContextProxyCommon;

// =============== Types for new non-proxy pages ================= //
// ===============   You've crossed the Bifrost!   ================ //

export interface DocumentProps {
  // props inspired by NextJS's metadata conventions
  // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#the-metadata-object
  title?: string;
  description?: string;
  viewport?: { [key: string]: string };
}

export type NoProxyConfig<LayoutProps> = ConfigConstructor<
  typeof InternalNoProxyConfig,
  {
    Layout: Layout<LayoutProps>;
    layoutProps: LayoutProps;
    documentProps: DocumentProps;
    scripts: string[];
    isLoggedIn: boolean;
  }
>;

type PageProps = Record<string, unknown>;
type Page = React.ComponentType<PageProps>;
// Context for non-proxied pages
interface PageContextNoProxyCommon<LayoutProps = Record<string, unknown>> {
  pageProps: PageProps;
  redirectTo?: string;
  documentProps?: DocumentProps;
  config: NoProxyConfig<LayoutProps>;
}

export type PageContextNoProxyServer = PageContextBuiltIn<Page> &
  PageContextNoProxyCommon;
export type PageContextNoProxyClient = PageContextBuiltInClient<Page> &
  PageContextNoProxyCommon;

export type PageContextNoProxy =
  | PageContextNoProxyServer
  | PageContextNoProxyClient;

export type PageContext =
  | PageContextNoProxy
  | PageContextProxy
  | PageContextProxyRestorationVisit;
