import { LayoutMap } from "@alignable/bifrost";
import { MainNavLayout } from "../../layouts/MainNavLayout";
import { VisitorLayout } from "../../layouts/VisitorLayout";

export default {
  main_nav: MainNavLayout,
  biz_layout: MainNavLayout,
  visitor: VisitorLayout,
} satisfies LayoutMap;
