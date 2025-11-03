import { navigate as vikeNavigate } from "vike/client/router";
export { prefetch } from "vike/client/router";

// TODO: Can we hook into onPageTransitionStart instead, allowing users to call Vike's navigate directly?
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
