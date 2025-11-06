import React from "react";

// Register turbolinks global for ios to hook into
const turbolinksIOSCompat = `window.Turbolinks = {controller:{restorationIdentifier: ''}};`;

/// emit turbolinks:load on DOMContentLoaded
const turbolinksLoadEvent = `addEventListener("DOMContentLoaded", () => {
  const event = new Event("turbolinks:load", { bubbles: true, cancelable: true });
  event.data = {url: window.location.href};
  document.dispatchEvent(event);  
});`;

/**
 * Hard reload when user navigates to a passthru turbolinks page.
 * Turbolinks navigates with history.pushState. When navigating passthru => bifrost (tracked scripts change), it reloads page.
 * Now on bifrost page, if user clicks back button, the browser sees the original navigation as initiated by pushState,
 * so the browser does not load the page. We detect this and force a reload.
 *
 * Further discussion on Vike handling this natively: https://github.com/vikejs/vike/issues/2801
 */
const turbolinksBackButton = `
addEventListener("popstate", (event) => {
  window._bifrost_pop_state = true
  if(event.state && event.state.turbolinks) window.location.reload();
});`;

export default function Head() {
  return (
    <>
      <script>
        {turbolinksIOSCompat + turbolinksLoadEvent + turbolinksBackButton}
      </script>
    </>
  );
}
