import React, { ReactNode } from "react";
import { PageContextProvider } from "../renderer/usePageContext.js";
import { PageContext } from "../types/internal.js";
import { NavigationProvider } from "../renderer/useNavigation.js";

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
        <NavigationProvider>{children}</NavigationProvider>
      </PageContextProvider>
    </React.StrictMode>
  );
}
