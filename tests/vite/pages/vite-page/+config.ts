import { MainNavLayout } from "../../layouts/MainNavLayout";
import { TerabithiaConfig } from "terabithia";
import { LayoutProps } from "../../layouts/types";

export default {
  Layout: MainNavLayout,
  layoutProps: { currentNav: "tmp" },
  documentProps: {
    title: "vite page",
  },
} satisfies TerabithiaConfig<LayoutProps>;
