import { MainNavLayout } from "../../layouts/MainNavLayout";
import { BifrostConfig } from "@alignable/bifrost";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  scripts: ["<script>console.log('hello from vite-page')</script>"],
  documentProps: {
    title: "vite page",
  },
  bodyAttrs: [
    { name: "id", value: "test-id" },
    { name: "class", value: "test-classname" },
  ],
} satisfies BifrostConfig;
