import React, { use } from "react";

export default function Page() {
  use(new Promise((resolve) => setTimeout(resolve, 10)));
  return (
    <>
      <h1>streamed page</h1>
    </>
  );
}
