import ProxyConfig from "terabithia/proxy/pages/+config";
import { Config } from "vite-plugin-ssr/types";

export default {
  extends: [ProxyConfig]
} satisfies Config;
