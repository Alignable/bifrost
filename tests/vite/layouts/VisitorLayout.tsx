import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export const VisitorLayout = ({ children }: { children: React.ReactNode }) => {
  const {
    config: { currentNav },
  } = usePageContext();
  return (
    <div>
      <nav>visitor layout</nav>
      <p>selected: {currentNav}</p>
      {children}
    </div>
  );
};
