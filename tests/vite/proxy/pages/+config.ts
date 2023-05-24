import ProxyConfig from "bifrost/proxy/pages/+config";
import { Config } from "vite-plugin-ssr/types";

export default {
  extends: [ProxyConfig]
} satisfies Config;
