declare global {
  namespace Vike {
    interface PageContextServer {
      loggedIn: boolean;
    }
    interface Config {
      currentNav?: string;
    }
  }
}

export {};
