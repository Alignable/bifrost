import { PropsWithChildren } from "react";
import {
  PageContextBuiltIn,
  PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient,
} from "vite-plugin-ssr/types";

// =============== Types for proxy pages ================= //
// ===============  Crossing the bridge  ================ //
export interface Proxy {
  body: string;
  head: string;
  bodyAttrs: Record<string, string>;
}

export type Layout<LayoutProps> = React.ComponentType<PropsWithChildren<LayoutProps>>;
export type LayoutMap<LayoutProps> = Record<string, Layout<LayoutProps>>;

type PageContextProxyCommon<LayoutProps = Record<string, unknown>> = {
  /// Which layout to render
  layout: string;
  /// Props to pass down to layout component. Proxied server should send this
  layoutProps: LayoutProps;
  config: {
    layoutMap: LayoutMap<LayoutProps>;
  };
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
  proxySendClient?: Proxy;
};
export type PageContextProxyServer = PageContextBuiltIn<Page> &
  PageContextProxyCommon & { proxy: Proxy };
export type PageContextProxyClient = PageContextBuiltInClient<Page> &
  PageContextProxyCommon &
  (PageContextProxyClientHydration | PageContextProxyClientNav);

export type PageContextProxy = PageContextProxyServer | PageContextProxyClient;

// =============== Types for new non-proxy pages ================= //
// ===============   You've crossed the Bifrost!   ================ //

export interface DocumentProps {
  // props inspired by NextJS's metadata conventions
  // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#the-metadata-object
  title?: string;
  description?: string;
  viewport?: { [key: string]: string }
}

export interface ScriptProps {
  googleAnalytics: string;
  osano: string;
}

type PageProps = Record<string, unknown>;
type Page = React.ComponentType<PageProps>;
// Context for non-proxied pages
interface PageContextNoProxyCommon<LayoutProps = Record<string, unknown>> {
  pageProps: PageProps;
  redirectTo?: string;
  documentProps?: DocumentProps;
  cmsStoryData?: any;
  config: {
    Layout: Layout<LayoutProps>;
    layoutProps?: LayoutProps;
    documentProps?: DocumentProps;
    isLoggedIn?: boolean;
    scripts: ScriptProps;
    cmsEnabled?: boolean;
  };
}

export type PageContextNoProxyServer = PageContextBuiltIn<Page> &
  PageContextNoProxyCommon;
export type PageContextNoProxyClient = PageContextBuiltInClient<Page> &
  PageContextNoProxyCommon;

export type PageContextNoProxy =
  | PageContextNoProxyServer
  | PageContextNoProxyClient;

export type PageContext = PageContextNoProxy | PageContextProxy;
