import ProxyConfig from "@alignable/bifrost/proxy/pages/+config";
import { ConfigNonHeaderFile } from "vite-plugin-ssr/types";

export default {
  extends: [ProxyConfig]
} satisfies ConfigNonHeaderFile;
