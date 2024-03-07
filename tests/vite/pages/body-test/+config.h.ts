import { MainNavLayout } from "../../layouts/MainNavLayout";
import { BifrostConfig } from "@alignable/bifrost";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  documentProps: {
    title: "body test page",
  },
  bodyAttrs: [
    { name: "id", value: "body-test-id" },
    { name: "class", value: "body-test-classname" },
  ],
} satisfies BifrostConfig;
