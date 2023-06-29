import React from "react";

const CUSTOM_HREF = {
  title: "legacy page",
  content: "legacy body",
  headScripts: ["inline1", "blocking", "defer"],
  bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
};
import "./index.css"

export default function Page() {
  return (
    <>
      <h1>head testing</h1>
      <a href='/vite-page'>vite page</a>
    </>
  );
}

// export const documentProps = {
//   // This title and description will override the defaults
//   title: "vite page",
//   description: "wowowow",
// };
