import { BifrostConfig } from "@alignable/bifrost";
import { LayoutProps } from "../../layouts/types";
import { MainNavLayout } from "../../layouts/MainNavLayout";

export default {
  Layout: MainNavLayout,
  documentProps: {
    title: "Error",
  },
} satisfies BifrostConfig<LayoutProps>;
