import turbolinks from "turbolinks";
import { navigateAnywhere } from "./navigateAnywhere";

export const Turbolinks = {
  visit: function (location, options?): void {
    const href = location.toString();
    navigateAnywhere(href, {
      overwriteLastHistoryEntry: options?.action === "replace",
    });
  } satisfies typeof turbolinks["visit"],
};

if (!window.Turbolinks) {
  window.Turbolinks = Turbolinks;
}
