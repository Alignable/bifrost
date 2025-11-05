import { LruCache } from "./lruCache";
import { Adapter } from "./adapter";
import { BrowserAdapter } from "./browser_adapter";
import { Location, Locatable } from "./location";
import { Action, isAction } from "./types";
import { closest, defer, dispatch, uuid } from "./util";
import { Visit } from "./visit";
import { PageContextClient } from "vike/types";

export type TimingData = {};
export type VisitOptions = { action: Action };

export interface Snapshot {
  bodyEl: HTMLElement;
  headEl: HTMLHeadElement;
  pageContext: PageContextClient;
}

export class Controller {
  adapter: Adapter = new BrowserAdapter(this);

  cache = new LruCache<Snapshot>(10);
  currentVisit?: Visit;
  enabled = true;
  lastRenderedLocation?: Location;
  location!: Location;
  progressBarDelay = 500;
  restorationIdentifier!: string; // This only exists for compatibility with iOS
  started = false;
  pageContext: any;

  start() {
    if (!this.started) {
      addEventListener("click", this.clickCaptured, true);
      this.location = Location.currentLocation;
      this.restorationIdentifier = uuid();
      this.lastRenderedLocation = this.location;
      this.started = true;
      this.enabled = true;
    }
  }

  disable() {
    this.enabled = false;
  }

  stop() {
    if (this.started) {
      removeEventListener("click", this.clickCaptured, true);
      this.started = false;
    }
  }

  clearCache() {
    this.cache = new LruCache(10);
  }

  visit(location: Locatable, options: Partial<VisitOptions> = {}) {
    location = Location.wrap(location);
    if (this.applicationAllowsVisitingLocation(location)) {
      if (this.locationIsVisitable(location)) {
        const action = options.action || "advance";
        this.adapter.visitProposedToLocationWithAction(location, action);
      } else {
        window.location.href = location.toString();
      }
    }
  }

  startVisitToLocationWithAction(
    location: Locatable,
    action: Action,
    restorationIdentifier?: string
  ) {
    this.startVisit(Location.wrap(location), action);
  }

  setProgressBarDelay(delay: number) {
    this.progressBarDelay = delay;
  }

  // For after redirect, on page load we update this info for ios adapter
  updateLocationAndRestorationIdentifier(
    locatable: Locatable,
    restorationIdentifier: string
  ) {
    this.location = Location.wrap(locatable);
    this.restorationIdentifier = restorationIdentifier;
  }

  // History delegate

  historyPoppedToLocationWithRestorationIdentifier(
    location: Locatable,
    restorationIdentifier: string
  ) {
    if (this.enabled) {
      this.location = Location.wrap(location);
      this.restorationIdentifier = restorationIdentifier;
      this.startVisit(this.location, "restore");
    } else {
      this.adapter.pageInvalidated();
    }
  }

  // Snapshot cache

  getCachedSnapshotForLocation(location: Locatable) {
    return this.cache.get(Location.wrap(location).toCacheKey());
  }

  shouldCacheSnapshot() {
    return (
      document.querySelector("#proxied-body") &&
      document.head
        .querySelector("meta[name='turbolinks-no-cache']")
        ?.getAttribute("content") != "no-cache"
    );
  }

  cacheSnapshot() {
    if (this.shouldCacheSnapshot()) {
      this.notifyApplicationBeforeCachingSnapshot();
      const snapshot = {
        bodyEl: document.body.cloneNode(true),
        headEl: document.head.cloneNode(true),
        pageContext: this.pageContext,
      };
      const location = this.lastRenderedLocation || Location.currentLocation;
      defer(() => this.cache.put(location.toCacheKey(), snapshot));
    }
  }

  // View
  viewInvalidated() {
    this.adapter.pageInvalidated();
  }

  viewWillRender() {
    this.notifyApplicationBeforeRender();
  }

  viewRendered() {
    this.lastRenderedLocation = this.currentVisit!.location;
    this.notifyApplicationAfterRender();
  }

  // Event handlers

  clickCaptured = () => {
    removeEventListener("click", this.clickBubbled, false);
    addEventListener("click", this.clickBubbled, false);
  };

  clickBubbled = (event: MouseEvent) => {
    if (this.enabled && this.clickEventIsSignificant(event)) {
      const link = this.getVisitableLinkForTarget(event.target);
      if (link) {
        const location = this.getVisitableLocationForLink(link);
        if (
          location &&
          this.applicationAllowsFollowingLinkToLocation(link, location)
        ) {
          event.preventDefault();
          event.stopPropagation();
          const action = this.getActionForLink(link);
          this.visit(location, { action });
        }
      }
    }
  };

  // Application events

  applicationAllowsFollowingLinkToLocation(link: Element, location: Location) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(
      link,
      location
    );
    return !event.defaultPrevented;
  }

  applicationAllowsVisitingLocation(location: Location) {
    const event = this.notifyApplicationBeforeVisitingLocation(location);
    return !event.defaultPrevented;
  }

  notifyApplicationAfterClickingLinkToLocation(
    link: Element,
    location: Location
  ) {
    return dispatch("turbolinks:click", {
      target: link,
      data: { url: location.absoluteURL },
      cancelable: true,
    });
  }

  notifyApplicationBeforeVisitingLocation(location: Location) {
    return dispatch("turbolinks:before-visit", {
      data: { url: location.absoluteURL },
      cancelable: true,
    });
  }

  notifyApplicationAfterVisitingLocation(location: Location) {
    return dispatch("turbolinks:visit", {
      data: { url: location.absoluteURL },
    });
  }

  notifyApplicationBeforeCachingSnapshot() {
    return dispatch("turbolinks:before-cache");
  }

  notifyApplicationBeforeRender() {
    return dispatch("turbolinks:before-render");
  }

  notifyApplicationAfterRender() {
    return dispatch("turbolinks:render");
  }

  notifyApplicationAfterPageLoad(timing: TimingData = {}) {
    return dispatch("turbolinks:load", {
      data: { url: this.location.absoluteURL, timing },
    });
  }

  // Private

  startVisit(location: Location, action: Action) {
    if (this.currentVisit) {
      this.currentVisit.cancel();
    }
    this.currentVisit = this.createVisit(location, action);
    this.currentVisit.start();
    this.notifyApplicationAfterVisitingLocation(location);
  }

  createVisit(location: Location, action: Action): Visit {
    const visit = new Visit(this, location, action);
    visit.referrer = this.location;
    if (action === "restore") {
      // dont issue navigate() because VPS already did.
      visit.requestInFlight = true;
    }
    return visit;
  }

  visitCompleted(visit: Visit) {
    this.notifyApplicationAfterPageLoad(visit.getTimingMetrics());
  }

  clickEventIsSignificant(event: MouseEvent) {
    return !(
      (event.target && (event.target as any).isContentEditable) ||
      event.defaultPrevented ||
      event.which > 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    );
  }

  getVisitableLinkForTarget(target: EventTarget | null) {
    if (target instanceof Element && this.elementIsVisitable(target)) {
      return closest(target, "a[href]:not([target]):not([download])");
    }
  }

  getVisitableLocationForLink(link: Element) {
    const location = new Location(link.getAttribute("href") || "");
    if (this.locationIsVisitable(location)) {
      return location;
    }
  }

  getActionForLink(link: Element): Action {
    const action = link.getAttribute("data-turbolinks-action");
    return isAction(action) ? action : "advance";
  }

  elementIsVisitable(element: Element) {
    const container = closest(element, "[data-turbolinks]");
    if (container) {
      return container.getAttribute("data-turbolinks") != "false";
    } else {
      return true;
    }
  }

  locationIsVisitable(location: Location) {
    return location.isPrefixedBy(new Location("/")) && location.isHTML();
  }
}
