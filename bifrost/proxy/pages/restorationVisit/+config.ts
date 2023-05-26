import { ConfigNonHeaderFile } from "vite-plugin-ssr/types";

export default {
  route: "import:@alignable/bifrost/proxy/pages/restorationVisit/route",
  Page: "import:@alignable/bifrost/proxy/pages/Page",
  meta: {
    onBeforeRender: {
      // We tell vite-plugin-ssr to load and execute onBeforeRender()
      // not only on the server-side but also on the client-side.
      // Moving onBeforeRender to client tells VPS it does not need to make network request on navigation
      env: "server-and-client",
    },
  },
} satisfies ConfigNonHeaderFile;
