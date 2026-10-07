import { Config } from "vike/types";

// Like Alignable's catch-all wrapped route: the backend decides between wrapped (layout header) and passthru.
export default {
  route: "/bench/*",
  injectScriptsAt: "HTML_BEGIN",
  proxyMode: "wrapped",
  proxyHeaders: {
    "X-VITE-PROXY": "1",
  },
  layoutHeaders: ["x-react-layout", "x-react-current-nav", "x-react-tracking", "x-react-footer"],
} satisfies Config;
