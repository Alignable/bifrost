import { Config } from "vike/types";

export default {
  proxyMode: "wrapped",
  proxyHeaders: {
    "X-VITE-PROXY": "1",
  },
} satisfies Config;
