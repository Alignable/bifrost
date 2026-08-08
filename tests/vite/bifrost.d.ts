declare global {
  namespace Vike {
    interface PageContextServer {
      loggedIn: boolean;
    }
    interface PageContext {
      currentNav?: string;
    }
    interface Config {
      currentNav?: string;
    }
    interface ProxyLayoutInfo {
      main_nav?: { currentNav: string };
      biz_layout?: { currentNav: string };
      visitor?: { currentNav: string };
      ssr_error?: { currentNav: string };
    }
    interface NestedComponents {
      myComponent: true;
    }
  }
}

export {};
