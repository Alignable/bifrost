import { MainNavLayout } from "../../layouts/MainNavLayout";
import { bifrostConfig } from "@alignable/bifrost";
import { LayoutProps } from "../../layouts/types";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  documentProps: {
    title: "vite page",
  },
} satisfies bifrostConfig<LayoutProps>;
