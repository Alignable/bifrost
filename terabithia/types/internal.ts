import { PropsWithChildren } from "react";
import {
  PageContextBuiltIn,
  PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient,
} from "vite-plugin-ssr/types";

export interface Proxy {
  body: string;
  head: string;
  bodyAttrs: Record<string, string>;
}

export interface DocumentProps {
  title?: string;
  description?: string;
}

type PageProps = Record<string, unknown>;
type Page = React.ComponentType<PageProps>;

type PageContextProxyCommon<LayoutProps extends Record<string, string>> = {
  /// Which layout to render
  layout: string;
  /// Props to pass down to layout component. Proxied server should send this
  layoutProps: LayoutProps;
  config: {
    layouts: Record<
      string,
      React.ComponentType<PropsWithChildren<LayoutProps>>
    >;
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

// Context for non-proxied pages
interface PageContextNoProxyCommon {
  pageProps: PageProps;
  redirectTo?: string;
  documentProps?: DocumentProps;
  config: {
    Layout: LayoutComponent;
    layoutProps?: LayoutProps;
    documentProps?: DocumentProps;
  };
}

export type PageContextNoProxyServer = PageContextBuiltIn<Page> &
  PageContextNoProxyCommon;
export type PageContextNoProxyClient = PageContextBuiltInClient<Page> &
  PageContextNoProxyCommon;

export type PageContextNoProxy =
  | PageContextNoProxyServer
  | PageContextNoProxyClient;

// export type PageContextServer = PageContextBuiltIn<Page> &
//   (PageContextProxyServer | PageContextNoProxyServer);

// export type PageContextClient = PageContextBuiltInClient<Page> &
//   (PageContextProxyClient | PageContextNoProxyClient);

export type PageContext = PageContextNoProxy | PageContextProxy;
