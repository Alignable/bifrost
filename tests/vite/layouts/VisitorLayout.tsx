import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export const VisitorLayout = ({
  children,
  currentNav,
}: {
  children: React.ReactNode;
  /// TODO: move to page context and adopt vike-react in bifrost?
  currentNav?: string;
}) => {
  const pageContext = usePageContext();
  return (
    <div>
      <nav>visitor layout</nav>
      <p>selected: {pageContext?.config?.currentNav || currentNav}</p>
      {children}
    </div>
  );
};
