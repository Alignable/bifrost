import { ConfigVpsUserProvided } from "vite-plugin-ssr/dist/types/shared/ConfigVps";
export default {
  // going off of https://github.com/brillout/vite-plugin-ssr/blob/3ae8b98e5333d46ec8d1c4ff47c532d429313135/vite-plugin-ssr/shared/ConfigVps.ts
  extensions: [
    {
      npmPackageName: "@vite-turbolinks-bridge/stem-plugin",
      pageConfigsDistFiles: [
        "@vite-turbolinks-bridge/stem-plugin/pages/+config.js",
        "@vite-turbolinks-bridge/stem-plugin/pages/+onRenderClient.js",
        "@vite-turbolinks-bridge/stem-plugin/pages/+onRenderHtml.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/+config.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/+onRenderClient.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/+onRenderHtml.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/+Page.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/+onBeforeRender.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/+onBeforeRoute.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/restorationVisit/+config.js",
        "@vite-turbolinks-bridge/stem-plugin/proxy/pages/restorationVisit/+route.js",
        // "@vite-turbolinks-bridge/stem-plugin/proxy/pages/restorationVisit/+Page.js",
      ],
    },
  ],
} satisfies ConfigVpsUserProvided;
