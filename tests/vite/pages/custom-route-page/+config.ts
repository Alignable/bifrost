import { MainNavLayout } from "../../layouts/MainNavLayout";
import { BifrostConfig } from "@alignable/bifrost";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  documentProps: {
    title: "custom route",
  },
} satisfies BifrostConfig;
