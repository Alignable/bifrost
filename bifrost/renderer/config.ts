import { type Config } from "vike/types";

export default {
  name: "@alignable/bifrost",
  require: {
    vike: ">=0.4.244",
    "vike-react": ">=0.6.11",
  },

  Head: "import:@alignable/bifrost/__internal/renderer/Head:default",
  headHtmlEnd:
    "import:@alignable/bifrost/__internal/renderer/headHtmlEnd:default",
  onBeforeRoute:
    "import:@alignable/bifrost/__internal/renderer/onBeforeRoute:default",

  passToClient: ["proxyLayoutInfo"],

  meta: {
    getLayout: { env: { server: true, client: true } },
    proxyHeaders: { env: { server: true, client: true } },
    proxyMode: {
      env: { server: true, client: true, config: true },
      effect({ configDefinedAt, configValue }) {
        switch (configValue) {
          case false:
            return {
              onBeforeRenderClient:
                "import:@alignable/bifrost/__internal/renderer/bifrost/onBeforeRenderClient:default",
              onAfterRenderClient:
                "import:@alignable/bifrost/__internal/renderer/bifrost/onAfterRenderClient:default",
            };
          case "wrapped":
            return {
              Page: "import:@alignable/bifrost/__internal/renderer/wrapped/Page:default" as any,
              onBeforeRenderHtml:
                "import:@alignable/bifrost/__internal/renderer/wrapped/onBeforeRenderHtml:default",
              onBeforeRender:
                "import:@alignable/bifrost/__internal/renderer/wrapped/onBeforeRender.client:default",
              onBeforeRenderClient:
                "import:@alignable/bifrost/__internal/renderer/wrapped/onBeforeRenderClient:default",
              onAfterRenderClient:
                "import:@alignable/bifrost/__internal/renderer/wrapped/onAfterRenderClient:default",
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

/**
 * Returning null tells Bifrost to run passthru proxy
 */
export type GetLayout = (
  headers: Record<string, number | string | string[] | undefined>
) => Vike.ProxyLayoutInfo | null;

declare global {
  namespace Vike {
    interface Config {
      proxyMode?: false | "wrapped" | "passthru";
      proxyHeaders?: Record<string, string>;
      getLayout?: GetLayout;
    }
    interface PageContext {
      proxyLayoutInfo?: ProxyLayoutInfo;
    }
    interface ProxyLayoutInfo {}
  }
}

// This is only used for fastify integration
export { type WrappedServerOnly } from "../lib/type";
