import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { WrappedWrapper } from "./wrapped/Wrapper";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  const { config } = usePageContext();
  if (config.proxyMode === "wrapped") {
    return <WrappedWrapper>{children}</WrappedWrapper>;
  }
  return <>{children}</>;
}
