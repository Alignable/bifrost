import { type Config } from "vike/types";

export default {
  name: "@alignable/bifrost",
  require: {
    vike: ">=0.4.244",
    "vike-react": ">=0.6.11",
  },

  headHtmlBegin:
    "import:@alignable/bifrost/__internal/renderer/headHtmlBegin:default",
  headHtmlEnd:
    "import:@alignable/bifrost/__internal/renderer/headHtmlEnd:default",
  onBeforeRoute:
    "import:@alignable/bifrost/__internal/renderer/onBeforeRoute:default",
  Wrapper: "import:@alignable/bifrost/__internal/renderer/Wrapper:default",

  passToClient: ["proxyLayoutInfo"],

  meta: {
    bodyAttributes: {
      // vike-react bodyAttributes are server-only, but legacy backend may change bodyAttributes and we need to reset on return to bifrost pages
      env: { server: true, client: true },
      global: true,
      cumulative: true,
    },
    getLayout: { env: { server: true, client: true } },
    layoutHeaders: { env: { server: true, client: false } },
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
              onRenderHtml:
                "import:@alignable/bifrost/__internal/renderer/wrapped/onRenderHtml:default",
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
            return {
              onRenderHtml:
                "import:@alignable/bifrost/__internal/renderer/passthru/onRenderHtml:default",
              clientRouting: false,
            };
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
      /** Response headers that should be consumed server-side and stripped before sending to the client. */
      layoutHeaders?: string[];
    }
    interface PageContext {
      proxyLayoutInfo?: ProxyLayoutInfo;
    }
    interface ProxyLayoutInfo {}
  }
}

// This is only used for fastify integration
export { type WrappedServerOnly } from "../lib/type";
