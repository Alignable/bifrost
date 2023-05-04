import { ConfigVpsUserProvided } from "vite-plugin-ssr/dist/types/shared/ConfigVps";
export default {
  // going off of https://github.com/brillout/vite-plugin-ssr/blob/3ae8b98e5333d46ec8d1c4ff47c532d429313135/vite-plugin-ssr/shared/ConfigVps.ts
  extensions: [
    {
      npmPackageName: "terabithia",
      pageConfigsDistFiles: [
        "terabithia/pages/+config.js",
        "terabithia/pages/+onRenderClient.js",
        "terabithia/pages/+onRenderHtml.js",
        "terabithia/proxy/pages/+config.js",
        "terabithia/proxy/pages/+onRenderClient.js",
        "terabithia/proxy/pages/+onRenderHtml.js",
        "terabithia/proxy/pages/+Page.js",
        "terabithia/proxy/pages/+onBeforeRender.js",
        "terabithia/proxy/pages/+onBeforeRoute.js",
        "terabithia/proxy/pages/restorationVisit/+config.js",
        "terabithia/proxy/pages/restorationVisit/+route.js",
      ],
    },
  ],
} satisfies ConfigVpsUserProvided;
