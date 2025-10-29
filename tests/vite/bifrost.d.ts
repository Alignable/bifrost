import "@alignable/bifrost";
declare module "@alignable/bifrost" {
  namespace AugmentMe {
    interface PageContextInit {
      loggedIn: boolean;
    }
  }
}

declare global {
  namespace Vike {
    // interface PageContext {
    //   currentNav: string;
    // }
    interface Config {
      currentNav?: string;
    }
  }
}
