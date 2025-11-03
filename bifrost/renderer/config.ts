import { type Config } from "vike/types";
import { type Snapshot } from "../lib/turbolinks/controller";

export default {
  name: "@alignable/bifrost",
  require: {
    vike: ">=0.4.244",
    "vike-react": ">=0.6.10",
  },

  // can prob del?
  clientHooks: true,
  clientRouting: true,

  onBeforeRoute: "import:@alignable/bifrost/renderer/onBeforeRoute:default",
  onBeforeRenderClient:
    "import:@alignable/bifrost/renderer/onBeforeRenderClient:default",
  onAfterRenderClient:
    "import:@alignable/bifrost/renderer/onAfterRenderClient:default",
  onBeforeRenderHtml:
    "import:@alignable/bifrost/renderer/onBeforeRenderHtml:default",
  Head: "import:@alignable/bifrost/renderer/Head:default",
  Wrapper: "import:@alignable/bifrost/renderer/Wrapper:default",

  passToClient: ["layout", "layoutProps", "redirectTo"],

  meta: {
    layoutMap: { env: { server: true, client: true } },
    getLayout: { env: { server: true, client: true } },
    proxyHeaders: { env: { server: true, client: true } },
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

export type GetLayout = (
  headers: Record<string, number | string | string[] | undefined>
) => {
  layout: string;
  layoutProps: Vike.LayoutProps;
};

declare global {
  namespace Vike {
    interface Config {
      proxyMode?: false | "wrapped" | "passthru";
      layoutMap?: Record<string, React.ComponentType<any>>;
      proxyHeaders?: Record<string, string>;
      getLayout?: GetLayout;
    }
    interface PageContext {
      layout: string;
      layoutProps: Vike.LayoutProps;

      /// TODO: remove?
      redirectTo?: string;
    }
    interface PageContextClient {
      _wrappedBodyHtml?: string;
      _waitForHeadScripts?: () => Promise<void>;
      snapshot?: Snapshot;
    }
    interface PageContextServer {
      wrappedServerOnly?: {
        // Up to onRenderHtml to move layout/layoutProps out so they can be passedToClient
        body: HTMLBodyElement;
        head: HTMLHeadElement;
        layout: string;
        layoutProps: Vike.LayoutProps;
      };
    }
    interface LayoutProps {}
  }
}
