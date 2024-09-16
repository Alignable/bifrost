import { BifrostConfig } from "@alignable/bifrost";
import { MainNavLayout } from "../../layouts/MainNavLayout";

export default {
  proxyMode: false,
  Layout: MainNavLayout,
  documentProps: {
    title: "Error",
  },
} satisfies BifrostConfig;
