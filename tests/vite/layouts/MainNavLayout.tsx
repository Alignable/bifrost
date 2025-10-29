import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export const MainNavLayout = ({ children }: { children: React.ReactNode }) => {
  const {
    config: { currentNav },
  } = usePageContext();
  return (
    <div>
      <nav>Main Nav Layout vite</nav>
      <p>selected: {currentNav}</p>
      {children}
    </div>
  );
};
