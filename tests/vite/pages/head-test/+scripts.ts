import { Scripts } from "@alignable/bifrost";

export default [
  `<script>console.log("script inserted by config")</script>`,
  (pc) => (pc.loggedIn ? "<script>console.log('logged in')</script>" : ""),
] satisfies Scripts;
