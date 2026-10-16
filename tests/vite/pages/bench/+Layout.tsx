import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { BenchVisitorLayout } from "../../layouts/BenchVisitorLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { proxyLayoutInfo } = usePageContext();
  return <BenchVisitorLayout footer={proxyLayoutInfo?.bench_visitor?.footer ?? true}>{children}</BenchVisitorLayout>;
}
