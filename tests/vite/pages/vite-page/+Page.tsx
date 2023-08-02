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
      <h1>vite is here</h1>
      <a href={`/custom?page=${encodeURI(JSON.stringify(CUSTOM_HREF))}`}>
        legacy page
      </a>
      <a href="/react-body-script-injection">
        react body
      </a>
      <a href="/head-test">head test</a>
    </>
  );
}

// export const documentProps = {
//   // This title and description will override the defaults
//   title: "vite page",
//   description: "wowowow",
// };
