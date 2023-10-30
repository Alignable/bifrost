import { PropsWithChildren } from "react";
import {
  Config,
  PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient,
  PageContextBuiltInServer,
} from "vike/types";
import InternalProxyConfig from "../proxy/pages/+config.js";
import InternalNoProxyConfig from "../renderer/+config.js";
import { type Snapshot } from "../lib/turbolinks/controller.js";

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
  alternates?: Alternates;
  viewport?: { [key: string]: string };
  metaTags?: MetaTag[];
}

type MetaTag = { name?: string; property?: string; content: string };

type Alternates = { canonical?: string };

export type OnClientInit = () => Promise<void>;

export type LayoutComponent = React.ComponentType<
  PropsWithChildren<AugmentMe.LayoutProps>
>;
export type LayoutMap = Record<string, LayoutComponent>;

export type ProxyConfig = ConfigConstructor<
  typeof InternalProxyConfig,
  {
    layoutMap: LayoutMap;
    onClientInit: OnClientInit;
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
export type PageContextProxyInit = PageContextBuiltInServer<Page> & {
  fromProxy: FromProxy;
};
export type PageContextProxyServer = PageContextBuiltInServer<Page> &
  PageContextProxyCommon & { proxy: string };
export type PageContextProxyClient = PageContextBuiltInClient<Page> &
  PageContextProxyCommon &
  (PageContextProxyClientHydration | PageContextProxyClientNav);

export type PageContextProxy = PageContextProxyServer | PageContextProxyClient;

export type PageContextProxyRestorationVisit =
  PageContextBuiltInClient<Page> & {
    snapshot: Snapshot;
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
    onClientInit: OnClientInit;
  }
>;

export type PageProps = Record<string, unknown>;
type Page = React.ComponentType<PageProps>;
export interface ApplicationFacingPageContext {
  pageProps: PageProps;
  documentProps?: DocumentProps;
  layoutProps: AugmentMe.LayoutProps;
  redirectTo?: string;
}
// Context for non-proxied pages
interface PageContextNoProxyCommon extends ApplicationFacingPageContext {
  config: NoProxyConfig;
}

export type PageContextNoProxyServer = PageContextBuiltInServer<Page> &
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
