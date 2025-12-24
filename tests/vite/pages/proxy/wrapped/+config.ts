import { Config } from "vike/types";

export default {
  proxyMode: "wrapped",
  proxyHeaders: {
    "X-VITE-PROXY": "1",
  },
  injectScriptsAt: "HTML_BEGIN",
} satisfies Config;
