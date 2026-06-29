import { usePageContext } from "vike-react/usePageContext";
import { MainNavLayout } from "../../../layouts/MainNavLayout";
import { VisitorLayout } from "../../../layouts/VisitorLayout";
import { SsrErrorLayout } from "../../../layouts/SsrErrorLayout";
import { NestedComponentPortal } from "@alignable/bifrost/NestedComponentPortal";
import React, { useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { proxyLayoutInfo, proxyNestedComponents } = usePageContext();

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
          <span data-testid="requested-components">
            {Object.keys(proxyNestedComponents ?? {}).sort().join(",")}
          </span>
          {proxyNestedComponents?.myComponent && (
            <NestedComponentPortal name="myComponent">
              <span>portaled react content</span>
            </NestedComponentPortal>
          )}
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
