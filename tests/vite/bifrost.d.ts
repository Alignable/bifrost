import "@alignable/bifrost";
declare module "@alignable/bifrost" {
  interface AppSpecificPageContextInit {
    loggedIn: boolean;
  }
}
