import ProxyConfig from "@alignable/bifrost/proxy/pages/+config";
import { Config } from "vite-plugin-ssr/types";

export default {
  extends: [ProxyConfig]
} satisfies Config;
