import { PropsWithChildren } from "react";
import {
  Config,
  OnBeforeRenderAsync,
  OnBeforeRenderSync,
  PageContextClient,
  PageContextServer,
} from "vike/types";
import { type Snapshot } from "../lib/turbolinks/controller.js";
import { bifrostConfig } from "../renderer/configs/bifrost.js";
import { wrappedConfig } from "../renderer/configs/wrapped.js";

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

type BodyAttrs = { name: string; value: string }[];

type MetaTag = { name?: string; property?: string; content: string };

type Alternates = { canonical?: string };

export type OnClientInit = () => Promise<void>;

export type LayoutComponent = React.ComponentType<
  PropsWithChildren<AugmentMe.LayoutProps>
>;
export type LayoutMap = Record<string, LayoutComponent>;

export type GetLayout = (
  headers: Record<string, number | string | string[] | undefined>
) => {
  layout: string;
  layoutProps: AugmentMe.LayoutProps;
};

type ProxyMode = "wrapped" | "passthru" | false;

export type ProxyConfig = ConfigConstructor<
  typeof wrappedConfig,
  {
    layoutMap: LayoutMap;
    getLayout: GetLayout;
    proxyMode: ProxyMode;
    onClientInit: OnClientInit;
  }
>;

type PageContextProxyCommon = {
  config: ProxyConfig;
};

type PageContextProxyPassedToClient = {
  /// Which LayoutComponent to render
  layout: string;
  /// Props to pass down to LayoutComponent component. Proxied server should send this
  layoutProps: AugmentMe.LayoutProps;
  redirectTo?: string;
};

export type PageContextProxyServer = PageContextServer &
  PageContextProxyCommon &
  PageContextProxyPassedToClient & {
    wrappedServerOnly?: {
      // Up to onRenderHtml to move layout/layoutProps out so they can be passedToClient
      layout: string;
      layoutProps: AugmentMe.LayoutProps;
      html: string;
    };
  };
export type PageContextProxyClientHydration = PageContextClient &
  PageContextProxyCommon &
  PageContextProxyPassedToClient & { isHydration: true };
export type PageContextProxyClientNavigation = PageContextClient &
  PageContextProxyCommon & { isHydration: false };
export type PageContextProxyClientRestorationVisit = PageContextClient &
  PageContextProxyCommon & {
    snapshot: Snapshot;
  };
export type PageContextProxyClient =
  | PageContextProxyClientHydration
  | PageContextProxyClientNavigation
  | PageContextProxyClientRestorationVisit;

type PageContextProxy = PageContextProxyClient | PageContextProxyServer;

// =============== Types for new non-proxy pages ================= //
// ===============   You've crossed the Bifrost!   ================ //

export type NoProxyConfig = ConfigConstructor<
  typeof bifrostConfig,
  {
    Layout: LayoutComponent;
    layoutProps: AugmentMe.LayoutProps;
    bodyAttrs: BodyAttrs;
    documentProps: DocumentProps;
    scripts: string[];
    favicon: string;
    onClientInit: OnClientInit;
    proxyMode: false;
  }
>;

export type PageProps = Record<string, unknown>;
type Page = React.ComponentType<PageProps>;
export interface ApplicationFacingPageContext {
  pageProps: PageProps;
  bodyAttrs?: BodyAttrs;
  documentProps?: DocumentProps;
  layoutProps: AugmentMe.LayoutProps;
  redirectTo?: string;
}
// Context for non-proxied pages
interface PageContextNoProxyCommon extends ApplicationFacingPageContext {
  config: NoProxyConfig;
}

export type PageContextNoProxyServer = PageContextServer &
  PageContextNoProxyCommon;
export type PageContextNoProxyClient = PageContextClient &
  PageContextNoProxyCommon;

export type PageContextNoProxy =
  | PageContextNoProxyServer
  | PageContextNoProxyClient;

export type PageContext = PageContextNoProxy | PageContextProxy;

declare global {
  namespace Vike {
    interface PageContext {
      Page?: React.ComponentType;
    }
    interface Config {
      proxyMode?: ProxyMode;
    }
  }
}
