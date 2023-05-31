import { Location } from "./location";
import { Snapshot } from "./snapshot";

export type RenderOptions = {
  snapshot: Snapshot;
  error: string;
  isPreview: boolean;
};

export class View {
  readonly htmlElement = document.documentElement as HTMLHtmlElement;

  constructor() {
  }

  getRootLocation(): Location {
    return this.getSnapshot().getRootLocation();
  }

  getElementForAnchor(anchor: string) {
    return this.getSnapshot().getElementForAnchor(anchor);
  }

  getSnapshot(): Snapshot {
    return Snapshot.fromHTMLElement(this.htmlElement);
  }

  // Private

  markAsPreview(isPreview: boolean | undefined) {
    if (isPreview) {
      this.htmlElement.setAttribute("data-turbolinks-preview", "");
    } else {
      this.htmlElement.removeAttribute("data-turbolinks-preview");
    }
  }

}
