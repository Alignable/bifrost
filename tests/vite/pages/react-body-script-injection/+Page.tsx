import React, {useEffect} from "react";

const CUSTOM_HREF = {
  title: "legacy page",
  content: "<a href='/react-body-script-injection'> React Body </a>",
  headScripts: ["inline1", "blocking", "defer"],
  bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
};

export default function Page() {
  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = "console.log('hello')"

    document.body.appendChild(script);

    // Cleanup script only on the last unmounted instance of TrustpilotWidget
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <h1>vite is here</h1>
      <a href={`/custom?page=${encodeURI(JSON.stringify(CUSTOM_HREF))}`}>
        legacy page
      </a>
    </>
  );
}
