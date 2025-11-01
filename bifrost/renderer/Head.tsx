import React from "react";

export default function Head() {
  return (
    <>
      <script>
        {`
      window.Turbolinks = {controller:{restorationIdentifier: ''}};
      addEventListener("DOMContentLoaded", () => {
        const event = new Event("turbolinks:load", { bubbles: true, cancelable: true });
        event.data = {url: window.location.href};
        document.dispatchEvent(event);  
      })`}
      </script>
    </>
  );
}
