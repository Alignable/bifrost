import { BifrostProxyConfig } from "@alignable/bifrost";

export default {
  proxyMode: "wrapped",
  proxyHeaders: {
    "X-VITE-PROXY": "1",
  },
} satisfies BifrostProxyConfig;
