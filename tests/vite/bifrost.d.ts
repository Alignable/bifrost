import "@alignable/bifrost";
declare module "@alignable/bifrost" {
  namespace AugmentMe {
    interface PageContextInit {
      loggedIn: boolean;
    }
    interface LayoutProps {
      currentNav: string;
    }
  }
}
