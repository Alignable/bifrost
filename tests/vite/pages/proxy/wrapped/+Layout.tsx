import { usePageContext } from "vike-react/usePageContext";
import { MainNavLayout } from "../../../layouts/MainNavLayout";
import { VisitorLayout } from "../../../layouts/VisitorLayout";
import { SsrErrorLayout } from "../../../layouts/SsrErrorLayout";
import React, { useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { proxyLayoutInfo } = usePageContext();

  useEffect(() => {
    const listener = () => {
      requestAnimationFrame(() => {
        // emit special event so that we can verify that the body changes in the frame immediately after turbolinks:before-render
        // This assures we don't cause flashing
        document.dispatchEvent(
          new Event("bifrost-testing:frame-after-before-render")
        );
      });
    };
    addEventListener("turbolinks:before-render", listener);
    return () => {
      removeEventListener("turbolinks:before-render", listener);
    };
  }, []);
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
    } else if (proxyLayoutInfo.ssr_error) {
      return <SsrErrorLayout>{children}</SsrErrorLayout>;
    }
  }
  return <>{children}</>;
}
