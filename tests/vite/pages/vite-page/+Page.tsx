import React from "react";
import { navigate } from "vike/client/router";

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
      <a href="/react-body-script-injection">react body</a>
      <a href="/head-test">head test</a>
      <div onClick={() => navigate("/head-test")}>programmatic navigate</div>
      <a href="/redirect-page">redirect page</a>
      <a href="#anchor">anchor link</a>
      <h2 id="anchor">anchor link test</h2>
      <div style={{ height: "1000px" }}></div>
    </>
  );
}
