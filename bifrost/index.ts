import { navigate as vikeNavigate } from "vike/client/router";
export { prefetch } from "vike/client/router";

// It would be great if we could just let people call `navigate` from Vike,
// Multiple blockers:
// - detecting advance/replace
// - canceling navigation in event handlers / adapter
export const navigate: typeof vikeNavigate = async (url, opts) => {
  window.Turbolinks.visit(url, {
    action: opts?.overwriteLastHistoryEntry ? "replace" : "advance",
  });
  if (window.Turbolinks.controller.currentVisit?.state === "started") {
    return new Promise((resolve) => {
      window.document.addEventListener("turbolinks:load", (ev) => resolve());
    });
  }
};
