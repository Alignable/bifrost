import { BifrostProxyConfig } from "@alignable/bifrost";
import PassthruProxyConfig from "@alignable/bifrost/proxy/pages/passthru/+config";

export default {
  extends: PassthruProxyConfig,
} satisfies BifrostProxyConfig;
