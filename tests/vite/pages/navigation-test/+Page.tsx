import { navigate, useNavigation } from "@alignable/bifrost";
import React from "react";

export default function Page() {
  const { state } = useNavigation();
  return (
    <>
      <a href="/slow-page">slow page</a>
      <button
        onClick={() => {
          navigate("/slow-page").then(() =>
            console.log("navigation promise resolved")
          );
        }}
      >
        navigate()
      </button>
      Navigation state: <div id="nav-state">{state}</div>
    </>
  );
}
