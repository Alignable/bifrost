import BifrostLibConfig from "@alignable/bifrost/renderer/+config";
import { BifrostConfig } from "@alignable/bifrost";

export default {
  extends: BifrostLibConfig,
  favicon: "https://www.google.com/favicon.ico",
  scripts: [
    `<script>if (!window.turboDebug) {
  [
    "turbolinks:click",
    "turbolinks:before-visit",
    "turbolinks:request-start",
    "turbolinks:visit",
    "turbolinks:request-end",
    "turbolinks:before-cache",
    "turbolinks:before-render",
    "turbolinks:render",
    "turbolinks:load",
  ].map((e) => {
    document.addEventListener(e, () => console.log(e));
  });
  window.turboDebug = true;
}</script>`,
  ],
} satisfies BifrostConfig;
