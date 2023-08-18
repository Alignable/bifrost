import { PropsWithChildren } from "react";
import {
  Config,
  PageContextBuiltIn,
  PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient,
} from "vite-plugin-ssr/types";
import InternalProxyConfig from "../proxy/pages/+config.js";
import InternalNoProxyConfig from "../renderer/+config.js";

/// Use module augmentation to override this in your app
export namespace AugmentMe {
  export interface PageContextInit {}
  export interface LayoutProps {}
}

// Utility type to ensure exported type matches meta defined in library
type ConfigConstructor<
  LibConfig extends Config,
  T extends { [K in keyof LibConfig["meta"]]: any }
> = Omit<Config, "extends"> & { extends?: Config } & Partial<T>;

// =============== Types for proxy pages ================= //
// ===============  Crossing the bridge  ================ //
// export interface Proxy {
//   body: string;
//   head: string;
//   bodyAttrs: Record<string, string>;
// }

export interface DocumentProps {
  // props inspired by NextJS's metadata conventions
  // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#the-metadata-object
  title?: string;
  description?: string;
  viewport?: { [key: string]: string };
  metaTags?: MetaTag[];
}

type MetaTag = { name?: string; property?: string; content: string };

export type LayoutComponent = React.ComponentType<
  PropsWithChildren<AugmentMe.LayoutProps>
>;
export type LayoutMap = Record<string, LayoutComponent>;

export type ProxyConfig = ConfigConstructor<
  typeof InternalProxyConfig,
  {
    layoutMap: LayoutMap;
  }
>;

type PageContextProxyCommon = {
  /// Which LayoutComponent to render
  layout: string;
  /// Props to pass down to LayoutComponent component. Proxied server should send this
  layoutProps: AugmentMe.LayoutProps;
  config: ProxyConfig;
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
type FromProxy = {
  layout: string;
  layoutProps: AugmentMe.LayoutProps;
  html: string;
};
export type PageContextProxyInit = PageContextBuiltIn<Page> & {
  fromProxy: FromProxy;
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

export type NoProxyConfig = ConfigConstructor<
  typeof InternalNoProxyConfig,
  {
    Layout: LayoutComponent;
    layoutProps: AugmentMe.LayoutProps;
    documentProps: DocumentProps;
    scripts: string[];
    favicon: string;
  }
>;

type PageProps = Record<string, unknown>;
type Page = React.ComponentType<PageProps>;
// Context for non-proxied pages
type PageContextNoProxyCommon = {
  pageProps: PageProps;
  redirectTo?: string;
  documentProps?: DocumentProps;
  layoutProps: AugmentMe.LayoutProps;
  config: NoProxyConfig;
};

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
