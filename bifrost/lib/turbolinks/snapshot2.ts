import { PageContextProxy } from "../../types/internal";
import { HeadDetails } from "./head_details";
import { Location } from "./location";
import { array } from "./util";

type ConfigData = Partial<PageContextProxy>;

// Contains everything needed to render a proxied page
export class ProxySnapshot {
  static fromHTMLString(html: string) {
    const element = document.createElement("html");
    element.innerHTML = html;
    element
      .querySelectorAll("a[rel='external']")
      .forEach((e) => e.setAttribute("data-turbolinks", "false"));
    element.querySelectorAll("a").forEach((e) => (e.rel = "external"));
    return this.fromHTMLElement(element);
  }

  static fromHTMLElement(htmlElement: HTMLHtmlElement) {
    const headElement = htmlElement.querySelector("head");
    const bodyElement =
      htmlElement.querySelector("body") || document.createElement("body");
    const headDetails = HeadDetails.fromHeadElement(headElement);
    return new this(headDetails, bodyElement);
  }

  headDetails?: HeadDetails;
  /// innerHTML of #proxied-body
  body?: string;

  constructor(configData: ConfigData, ) {
    this.configData = configData;
  }

  /*
  clone(): Snapshot {
    return new Snapshot(this.headDetails, this.bodyElement.cloneNode(true));
  }
  */

  getCacheControlValue() {
    return this.getSetting("cache-control");
  }

  getElementForAnchor(anchor: string) {
    try {
      return this.bodyElement.querySelector(
        `[id='${anchor}'], a[name='${anchor}']`
      );
    } catch {
      return null;
    }
  }

  hasAnchor(anchor: string) {
    return this.getElementForAnchor(anchor) != null;
  }

  isPreviewable() {
    return this.getCacheControlValue() != "no-preview";
  }

  static isCacheable(bodyElement: HTMLBodyElement) {
    return (
      this.bodyElement.querySelector("#proxied-body") &&
      this.getCacheControlValue() != "no-cache"
    );
  }

  isVisitable() {
    return this.getSetting("visit-control") != "reload";
  }

  // Private

  getSetting(name: string): string | undefined;
  getSetting(name: string, defaultValue: string): string;
  getSetting(name: string, defaultValue?: string) {
    const value = this.headDetails.getMetaValue(`turbolinks-${name}`);
    return value == null ? defaultValue : value;
  }
}
