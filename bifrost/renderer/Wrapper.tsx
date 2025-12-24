import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  const pageContext = usePageContext();

  // We want to fire `turbolinks:before-render` as late as possible - synchronously before rendering the page.
  // This is important because before-render scripts may clear the DOM, and we want to paint the new page immediately
  // onBeforeRenderClient awaits for promises so there is a delay
  if (pageContext.isClientSide && !pageContext.isHydration && !pageContext._turbolinksBeforeRenderEmitted) {
    window.Turbolinks.controller.viewWillRender();
    pageContext._turbolinksBeforeRenderEmitted = true;
  }
  
  return <>{children}</>;
}
