import React, { ReactNode } from "react";
import { PageContextProvider } from "../pages/usePageContext";
import { PageContext, PageContextNoProxy } from "@vite-turbolinks-bridge/types";

export function PageShell({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: ReactNode;
}) {
  return (
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        {children}
      </PageContextProvider>
    </React.StrictMode>
  );
}
