import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  const pageContext = usePageContext();

  // We want to fire `turbolinks:before-render` as late as possible - synchronously before rendering the page.
  // This is important because before-render scripts may clear the DOM, and we want to paint the new page immediately
  // onBeforeRenderClient awaits for promises so there is a delay
  if (pageContext.isClientSide && pageContext._shouldEmitBeforeRender) {
    try {
      window.Turbolinks.controller.viewWillRender();
    } catch (error) {
      // Some logging to diagnose `window.Turbolinks.controller.viewWillRender is not a function`. Remove this after fixing
      console.error("Error calling window.Turbolinks.controller.viewWillRender:", error);
      console.error("Turbolinks:", window.Turbolinks);

      throw error;
    }
    
    pageContext._shouldEmitBeforeRender = false;
  }
  
  return <>{children}</>;
}
