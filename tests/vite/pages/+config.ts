import vikeReact from "vike-react/config";
import bifrostReact from "@alignable/bifrost/config";
import { Config } from "vike/types";

export default {
  extends: [vikeReact, bifrostReact],
  baseAssets: "/bifrost-assets",
  proxyMode: false,
  meta: {
    currentNav: { env: { server: true, client: true } },
  },
  currentNav: "tmp",
  favicon: "https://www.google.com/favicon.ico",
  bodyAttributes: { id: "test-id", class: "test-classname" },
} satisfies Config;
