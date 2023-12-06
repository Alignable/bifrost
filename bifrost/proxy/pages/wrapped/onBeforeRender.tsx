import { PageContextProxyInit } from "../../../types/internal";

export default async function onBeforeRender(
  pageContext: PageContextProxyInit
) {
  if (pageContext.fromProxy) {
    const { fromProxy } = pageContext;
    if (pageContext.isClientSideNavigation) {
      return {
        pageContext: {
          layout: fromProxy.layout,
          layoutProps: fromProxy.layoutProps,
          // proxySendClient is serialized and sent to client on subsequent navigation.
          // Important that we dont send it on ssr
          proxySendClient: fromProxy.html,
        },
      };
    } else {
      return {
        pageContext: {
          layout: fromProxy.layout,
          layoutProps: fromProxy.layoutProps,
          // proxy is ONLY included server-side to avoid doubling page size
          proxy: fromProxy.html,
        },
      };
    }
  }
}
