import React from "react";

export const SsrErrorLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // This will throw during SSR because window is not available on the server
  const href = window.location.href;
  return (
    <div>
      <nav>SSR Error Layout</nav>
      <p>current url: {href}</p>
      {children}
    </div>
  );
};
