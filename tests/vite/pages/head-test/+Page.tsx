import React from "react";

const CUSTOM_HREF = {
  title: "legacy page",
  content: "legacy body",
  headScripts: ["inline1", "blocking", "defer"],
  bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
};

export default function Page() {
  return (
    <>
      <h1>head testing</h1>
    </>
  );
}

// export const documentProps = {
//   // This title and description will override the defaults
//   title: "vite page",
//   description: "wowowow",
// };
