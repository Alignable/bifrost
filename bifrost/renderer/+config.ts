import { type Config } from "vike/types";
import { bifrostConfig } from "./configs/bifrost";
import { wrappedConfig } from "./configs/wrapped";

export default {
  name: "@alignable/bifrost",
  require: {
    vike: ">=0.4.244",
  },
  clientHooks: true,

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
            // tell Vike to hit the server for all passthru pages (which will get load balanced to legacy backend)
            return { clientRouting: false };
          default:
            throw new Error(
              `${configDefinedAt} should be one of: false, "wrapped", "passthru"`
            );
        }
      },
    },
  },
} satisfies Config;
