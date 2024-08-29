import { BifrostProxyConfig } from "@alignable/bifrost";

export default {
  route: "/*",
  clientRouting: false,
  proxyMode: "passthru",
} satisfies BifrostProxyConfig;
