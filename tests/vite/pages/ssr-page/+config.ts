import { MainNavLayout } from "../../layouts/MainNavLayout";
import { Config } from "vike/types";

export default {
  Layout: MainNavLayout,
  title: "ssr page",
  stream: { require: true, enable: false},
} satisfies Config;
