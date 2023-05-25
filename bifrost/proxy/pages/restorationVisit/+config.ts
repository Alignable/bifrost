import { ConfigNonHeaderFile } from "vite-plugin-ssr/types";

export default {
  routePath: "@alignable/bifrost/proxy/pages/restorationVisit/route",
  PagePath: "@alignable/bifrost/proxy/pages/Page",
  meta: {
    onBeforeRender: {
      // We tell vite-plugin-ssr to load and execute onBeforeRender()
      // not only on the server-side but also on the client-side.
      // Moving onBeforeRender to client tells VPS it does not need to make network request on navigation
      env: "server-and-client",
    },
  },
} satisfies ConfigNonHeaderFile;
