import { Config } from "vike/types";

export default {
  proxyMode: "wrapped",
  proxyHeaders: {
    "X-VITE-PROXY": "1",
  },
  meta: {
    // TODO: This should not be neccessary but the config effect and .client extensions are not preventing onBeforeRender from being included in the server build.
    onBeforeRender: { env: { client: true, server: false } },
  },
} satisfies Config;
