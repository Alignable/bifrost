import { PageContextClient } from "vike/types";

export const onAfterRenderClient = (pageContext: PageContextClient) => {
  if (pageContext.isClientSideNavigation) {
    // remove scripts coming from legacy
    document
      .querySelectorAll(
        'link[rel="stylesheet"][data-turbolinks-track="reload"]'
      )
      .forEach((script) => {
        script.remove();
      });
  }
};
