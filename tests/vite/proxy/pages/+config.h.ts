import { BifrostProxyConfig } from "@alignable/bifrost/index";
import ProxyConfig from "@alignable/bifrost/proxy/pages/+config";
import { LayoutProps } from "../../layouts/types";

export default {
  extends: ProxyConfig
} satisfies BifrostProxyConfig<LayoutProps>;
