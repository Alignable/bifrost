import { LruCache } from "../lruCache";
import { Adapter } from "./adapter";
import { BrowserAdapter } from "./browser_adapter";
import { Location, Locatable } from "./location";
import { ScrollManager } from "./scroll_manager";
import { Action, Position, isAction } from "./types";
import { closest, defer, dispatch, uuid } from "./util";
import { Visit } from "./visit";

export type RestorationData = { scrollPosition?: Position };
export type RestorationDataMap = { [uuid: string]: RestorationData };
export type TimingData = {};
export type VisitOptions = { action: Action };
export type VisitProperties = {
  restorationIdentifier: string;
  restorationData: RestorationData;
  historyChanged: boolean;
};

interface Snapshot {
  bodyEl: Element;
  headEl: Element;
  pageContext: any;
}

export class Controller {
  static supported = !!(
    typeof window !== "undefined" &&
    window.addEventListener
  );

  adapter: Adapter = new BrowserAdapter(this);
  readonly restorationData: RestorationDataMap = {};
  readonly scrollManager = new ScrollManager(this);

  cache = new LruCache<Snapshot>(10);
  currentVisit?: Visit;
  enabled = true;
  lastRenderedLocation?: Location;
  location!: Location;
  progressBarDelay = 500;
  restorationIdentifier!: string;
  started = false;
  pageContext: any;

  start() {
    if (Controller.supported && !this.started) {
      // TODO: delete document.body in this file. We are doing this to pre-empt VPS interceptor.
      // https://github.com/brillout/vite-plugin-ssr/issues/918 fixes this.
      document.body.addEventListener("click", this.clickCaptured, true);
      this.scrollManager.start();
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
      document.body.removeEventListener("click", this.clickCaptured, true);
      this.scrollManager.stop();
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
    restorationIdentifier: string
  ) {
    if (Controller.supported) {
      const restorationData = this.getRestorationDataForIdentifier(
        restorationIdentifier
      );
      this.startVisit(Location.wrap(location), action, { restorationData });
    } else {
      window.location.href = location.toString();
    }
  }

  setProgressBarDelay(delay: number) {
    this.progressBarDelay = delay;
  }

  // History delegate

  historyPoppedToLocationWithRestorationIdentifier(
    location: Locatable,
    restorationIdentifier: string
  ) {
    if (this.enabled) {
      this.location = Location.wrap(location);
      this.restorationIdentifier = restorationIdentifier;
      const restorationData = this.getRestorationDataForIdentifier(
        restorationIdentifier
      );
      this.startVisit(this.location, "restore", {
        restorationIdentifier,
        restorationData,
        historyChanged: true,
      });
    } else {
      this.adapter.pageInvalidated();
    }
  }

  // Snapshot cache

  getCachedSnapshotForLocation(location: Locatable){
    return this.cache.get(Location.wrap(location).toCacheKey());
  }

  shouldCacheSnapshot() {
    return (
      document.body.querySelector("#proxied-body") &&
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

  // Scrolling

  scrollToAnchor(anchor: string) {
    const element = document.body.querySelector(
      `[id='${anchor}'], a[name='${anchor}']`
    );
    if (element) {
      this.scrollToElement(element);
    } else {
      this.scrollToPosition({ x: 0, y: 0 });
    }
  }

  scrollToElement(element: Element) {
    this.scrollManager.scrollToElement(element);
  }

  scrollToPosition(position: Position) {
    this.scrollManager.scrollToPosition(position);
  }

  // Scroll manager delegate

  scrollPositionChanged(position: Position) {
    const restorationData = this.getCurrentRestorationData();
    restorationData.scrollPosition = position;
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
    document.body.removeEventListener("click", this.clickBubbled, false);
    document.body.addEventListener("click", this.clickBubbled, false);
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

  startVisit(
    location: Location,
    action: Action,
    properties: Partial<VisitProperties>
  ) {
    if (this.currentVisit) {
      this.currentVisit.cancel();
    }
    this.currentVisit = this.createVisit(location, action, properties);
    this.currentVisit.start();
    this.notifyApplicationAfterVisitingLocation(location);
  }

  createVisit(
    location: Location,
    action: Action,
    properties: Partial<VisitProperties>
  ): Visit {
    const visit = new Visit(
      this,
      location,
      action,
      properties.restorationIdentifier
    );
    visit.restorationData = { ...(properties.restorationData || {}) };
    visit.historyChanged = !!properties.historyChanged;
    visit.referrer = this.location;
    if(action === 'restore') { 
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

  getCurrentRestorationData(): RestorationData {
    return this.getRestorationDataForIdentifier(this.restorationIdentifier);
  }

  getRestorationDataForIdentifier(identifier: string): RestorationData {
    if (!(identifier in this.restorationData)) {
      this.restorationData[identifier] = {};
    }
    return this.restorationData[identifier];
  }
}
