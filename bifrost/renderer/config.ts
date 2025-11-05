import { type Config } from "vike/types";
import { type Snapshot } from "../lib/turbolinks/controller";
import { type Turbolinks } from "../lib/turbolinks";

export default {
  name: "@alignable/bifrost",
  require: {
    vike: ">=0.4.244",
    "vike-react": ">=0.6.10",
  },

  onBeforeRoute: "import:@alignable/bifrost/renderer/onBeforeRoute:default",
  onBeforeRenderClient:
    "import:@alignable/bifrost/renderer/onBeforeRenderClient:default",
  onAfterRenderClient:
    "import:@alignable/bifrost/renderer/onAfterRenderClient:default",
  onBeforeRenderHtml:
    "import:@alignable/bifrost/renderer/onBeforeRenderHtml:default",
  Head: "import:@alignable/bifrost/renderer/Head:default",

  passToClient: ["layout", "layoutProps"],

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
              Page: "import:@alignable/bifrost/renderer/wrapped/Page:default" as any,
              onBeforeRender:
                "import:@alignable/bifrost/renderer/wrapped/onBeforeRender:default",
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

      // Not passed to client, derived in onBeforeRenderHtml and onBeforeRenderClient
      _turbolinksProxy?: {
        body: HTMLElement;
        head?: HTMLHeadElement;
      };
    }
    interface PageContextClient {
      snapshot?: Snapshot;
      _waitForHeadScripts?: () => Promise<void>;
    }
    interface PageContextServer {
      wrappedServerOnly?: {
        body: HTMLBodyElement;
        head: HTMLHeadElement;
        // layout/layoutProps CANNOT be in pageContextInit as that will force Vike to make pageContext.json requests
        // https://vike.dev/pageContext.json#avoid-pagecontext-json-requests
        // Instead, we nest them inside wrappedServerOnly and move them to top-level pageContext in onBeforeRenderHtml
        layout: string;
        layoutProps: Vike.LayoutProps;
      };
    }
    interface LayoutProps {}
  }

  interface Window {
    Turbolinks: Turbolinks;
  }
}
