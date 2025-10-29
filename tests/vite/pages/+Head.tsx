import React from "react";
import { usePageContext } from "vike-react/usePageContext";

export function Head() {
  const pageContext = usePageContext();
  return (
    <>
      <script>{`if (!window.turboDebug) {
  [
    "turbolinks:click",
    "turbolinks:before-visit",
    "turbolinks:request-start",
    "turbolinks:visit",
    "turbolinks:request-end",
    "turbolinks:before-cache",
    "turbolinks:before-render",
    "turbolinks:render",
    "turbolinks:load",
  ].map((e) => {
    document.addEventListener(e, () => console.log(e));
  });
  window.turboDebug = true;
}`}</script>
      {pageContext.loggedIn && <script>console.log('logged in')</script>}
    </>
  );
}
