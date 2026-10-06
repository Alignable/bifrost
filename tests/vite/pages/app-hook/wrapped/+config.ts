import { Config } from "vike/types";

export default {
  proxyMode: "wrapped",
  proxyHeaders: {
    "X-VITE-PROXY": "1",
  },
  layoutHeaders: ["x-react-layout", "x-react-current-nav"],
} satisfies Config;
