import { type Config } from "vike/types";
import { bifrostConfig } from "./configs/bifrost";
import { wrappedConfig } from "./configs/wrapped";

export default {
  name: "@alignable/bifrost",
  require: {
    vike: ">=0.4.193",
  },
  Page: "import:@alignable/bifrost/renderer/dummyPage:default",

  onBeforeRoute: "import:@alignable/bifrost/renderer/onBeforeRoute:default",
  onRenderClient: "import:@alignable/bifrost/renderer/onRenderClient:default",
  onRenderHtml: "import:@alignable/bifrost/renderer/onRenderHtml:default",
  passToClient: [...bifrostConfig.passToClient, ...wrappedConfig.passToClient],
  clientRouting: true,
  hydrationCanBeAborted: true,

  meta: {
    ...bifrostConfig.meta,
    ...wrappedConfig.meta,
    onClientInit: { env: { client: true }, global: true },

    proxyMode: {
      env: { server: true, client: true, config: true },
      // TODO: effect should lint config values, check that NoProxy meta is only used where allowed.
      effect({ configDefinedAt, configValue }) {
        switch (configValue) {
          case false:
            return {};
          case "wrapped":
            return {
              meta: {
                onBeforeRender: { env: { client: true, server: false } },
              },
            };
          case "passthru":
            return {};
          default:
            throw new Error(
              `${configDefinedAt} should be one of: false, "wrapped", "passthru"`
            );
        }
      },
    },
  },
} satisfies Config;
