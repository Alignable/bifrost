import { usePageContext } from "vike-react/usePageContext";
import { MainNavLayout } from "../../../layouts/MainNavLayout";
import { VisitorLayout } from "../../../layouts/VisitorLayout";
import React from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { proxyLayoutInfo } = usePageContext();
  if (proxyLayoutInfo) {
    const main_nav = proxyLayoutInfo.main_nav || proxyLayoutInfo.biz_layout;
    if (main_nav) {
      return (
        <MainNavLayout currentNav={main_nav.currentNav}>
          {children}
        </MainNavLayout>
      );
    } else if (proxyLayoutInfo.visitor) {
      return (
        <VisitorLayout currentNav={proxyLayoutInfo.visitor.currentNav}>
          {children}
        </VisitorLayout>
      );
    }
  }
  return <>{children}</>;
}
