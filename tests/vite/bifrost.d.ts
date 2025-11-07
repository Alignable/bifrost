declare global {
  namespace Vike {
    interface PageContextServer {
      loggedIn: boolean;
    }
    interface Config {
      currentNav?: string;
    }
    interface ProxyLayoutInfo {
      main_nav?: { currentNav: string };
      biz_layout?: { currentNav: string };
      visitor?: { currentNav: string };
    }
  }
}

export {};
