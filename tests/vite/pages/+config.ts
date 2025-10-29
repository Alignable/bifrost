import vikeReact from "vike-react/config";
import { Config } from "vike/types";

export default {
  extends: [vikeReact],
  baseAssets: "/bifrost-assets",
  meta: {
    currentNav: { env: { server: true, client: true } },
  },

  currentNav: "tmp",
  favicon: "https://www.google.com/favicon.ico",
  bodyAttributes: { id: "test-id", class: "test-classname" },
} satisfies Config;
