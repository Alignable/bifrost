import { DynamicScripts } from "@alignable/bifrost";

export default [
  (pc) => (pc.loggedIn ? "<script>console.log('logged in')</script>" : ""),
] satisfies DynamicScripts;
