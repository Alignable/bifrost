import { LayoutMap } from "@alignable/bifrost";
import { MainNavLayout } from "../../layouts/MainNavLayout";
import { VisitorLayout } from "../../layouts/VisitorLayout";
import { LayoutProps } from "../../layouts/types";

export default {
  main_nav: MainNavLayout,
  biz_layout: MainNavLayout,
  visitor: VisitorLayout,
} satisfies LayoutMap<LayoutProps>;
