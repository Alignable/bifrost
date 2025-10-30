import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export const MainNavLayout = ({
  children,
  currentNav,
}: {
  children: React.ReactNode;
  currentNav?: string;
}) => {
  const pageContext = usePageContext();
  return (
    <div>
      <nav>Main Nav Layout vite</nav>
      <p>selected: {pageContext?.config?.currentNav || currentNav}</p>
      {children}
    </div>
  );
};
