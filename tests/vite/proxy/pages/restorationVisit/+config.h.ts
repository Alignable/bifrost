import RestorationConfig from "@alignable/bifrost/proxy/pages/restorationVisit/+config";
import { BifrostProxyConfig } from "@alignable/bifrost";
import { LayoutProps } from "../../../layouts/types";

export default {
  extends: RestorationConfig
} satisfies BifrostProxyConfig<LayoutProps>;
