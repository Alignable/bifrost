import { MainNavLayout } from "../../layouts/MainNavLayout";
import { BifrostConfig } from "@alignable/bifrost";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  documentProps: {
    title: "head test",
    description: "a cool description",
    metaTags: [{name: "theme-color", content: "black"}]
  },
  scripts: [`<script>console.log("script inserted by config")</script>`],
} satisfies BifrostConfig;
