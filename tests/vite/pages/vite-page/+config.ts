import { Config } from "vite-plugin-ssr/types";
import { MainNavLayout } from "../../layouts/MainNavLayout";

export default {
  Layout: MainNavLayout,
  documentProps: {
    title: "vite page",
  },
} as Config;
