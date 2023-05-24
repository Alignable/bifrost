import turbolinks from "turbolinks";
import { navigateAnywhere } from "./navigateAnywhere";

export const Turbolinks = {
  visit: function (location, options?): void {
    const href = location.toString();
    navigateAnywhere(href, {
      overwriteLastHistoryEntry: options?.action === "replace",
    });
  } as (typeof turbolinks)["visit"],
};

if (typeof window !== "undefined" && !window.Turbolinks) {
  window.Turbolinks = Turbolinks;
}
