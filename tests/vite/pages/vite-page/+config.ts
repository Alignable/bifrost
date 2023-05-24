import { MainNavLayout } from "../../layouts/MainNavLayout";
import { bifrostConfig } from "bifrost";
import { LayoutProps } from "../../layouts/types";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  documentProps: {
    title: "vite page",
  },
} satisfies bifrostConfig<LayoutProps>;
