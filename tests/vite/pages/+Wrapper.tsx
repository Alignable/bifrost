import React, { Suspense } from "react";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      {children}
    </Suspense>
  );
}
