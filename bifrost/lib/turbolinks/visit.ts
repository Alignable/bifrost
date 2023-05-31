import { navigate } from "vite-plugin-ssr/client/router";
import { Adapter } from "./adapter";
import { Controller, RestorationData } from "./controller";
import { Location } from "./location";
import { Action } from "./types";
import { uuid } from "./util";
import { Renderer } from "./renderer";

export enum TimingMetric {
  visitStart = "visitStart",
  requestStart = "requestStart",
  requestEnd = "requestEnd",
  visitEnd = "visitEnd",
}

export type TimingMetrics = Partial<{ [metric in TimingMetric]: any }>;

export enum VisitState {
  initialized = "initialized",
  started = "started",
  canceled = "canceled",
  failed = "failed",
  completed = "completed",
}

export class Visit {
  readonly controller: Controller;
  readonly action: Action;
  readonly adapter: Adapter;
  readonly identifier = uuid();
  readonly restorationIdentifier: string;
  readonly timingMetrics: TimingMetrics = {};

  followedRedirect = false;
  frame?: number;
  historyChanged = false;
  location: Location;
  progress = 0;
  referrer?: Location;
  redirectedToLocation?: Location;
  restorationData?: RestorationData;
  scrolled = false;
  snapshotCached = false;
  state = VisitState.initialized;

  requestInFlight = false;
  renderer?: Renderer;

  constructor(
    controller: Controller,
    location: Location,
    action: Action,
    restorationIdentifier: string = uuid()
  ) {
    this.controller = controller;
    this.location = location;
    this.action = action;
    this.adapter = controller.adapter;
    this.restorationIdentifier = restorationIdentifier;
  }

  start() {
    if (this.state == VisitState.initialized) {
      this.recordTimingMetric(TimingMetric.visitStart);
      this.state = VisitState.started;
      this.adapter.visitStarted(this);
    }
  }

  cancel() {
    if (this.state == VisitState.started) {
      this.requestInFlight = false;
      this.cancelRender();
      this.state = VisitState.canceled;
    }
  }

  complete() {
    if (this.state == VisitState.started) {
      this.recordTimingMetric(TimingMetric.visitEnd);
      this.state = VisitState.completed;
      this.adapter.visitCompleted(this);
      this.controller.visitCompleted(this);
    }
  }

  fail() {
    if (this.state == VisitState.started) {
      this.state = VisitState.failed;
      this.adapter.visitFailed(this);
    }
  }

  changeHistory() {
    // no-op since issueRequest calls navigate which handles all of this already
    return;
  }

  issueRequest() {
    if (!this.requestInFlight) {
      if (this.shouldIssueRequest()) {
      }
      const url = new URL(this.location.toString(), this.location.getOrigin());
      navigate(url.pathname + url.hash + url.search, {
        overwriteLastHistoryEntry: this.action === "replace",
      }).catch(console.error);
      this.progress = 0;
      this.requestInFlight = true;
    }
  }

  getCachedSnapshot() {
    const snapshot = this.controller.getCachedSnapshotForLocation(
      this.location
    );
    if (
      snapshot &&
      (!this.location.anchor || snapshot.hasAnchor(this.location.anchor))
    ) {
      if (this.action == "restore" || snapshot.isPreviewable()) {
        return snapshot;
      }
    }
  }

  hasCachedSnapshot() {
    return this.getCachedSnapshot() != null;
  }

  loadCachedSnapshot() {
    // no-op since issueRequest calls navigate which handles all of this already
    return;
    // const snapshot = this.getCachedSnapshot();
    // if (snapshot) {
    //   const isPreview = this.shouldIssueRequest();
    //   this.render(() => {
    //     this.cacheSnapshot();
    //     this.controller.render({ snapshot, isPreview }, this.performScroll);
    //     this.adapter.visitRendered(this);
    //     if (!isPreview) {
    //       this.complete();
    //     }
    //   });
    // }
  }

  loadResponse() {
    this.render(async () => {
      if (!this.renderer) throw new Error("Renderer not set before rendering");
      this.cacheSnapshot();
      // await this.renderFn();
      await this.renderer.render(this.controller, this.performScroll);
      this.adapter.visitRendered(this);
      this.complete();
    });
  }

  followRedirect() {
    if (this.redirectedToLocation && !this.followedRedirect) {
      this.location = this.redirectedToLocation;
      this.controller.replaceHistoryWithLocationAndRestorationIdentifier(
        this.redirectedToLocation,
        this.restorationIdentifier
      );
      this.followedRedirect = true;
    }
  }

  // HTTP request delegate

  /*
  requestStarted() {
    this.recordTimingMetric(TimingMetric.requestStart);
    this.adapter.visitRequestStarted(this);
  }

  requestProgressed(progress: number) {
    this.progress = progress;
    if (this.adapter.visitRequestProgressed) {
      this.adapter.visitRequestProgressed(this);
    }
  }

  requestCompletedWithResponse(
    response: string,
    redirectedToLocation?: Location
  ) {
    this.response = response;
    this.redirectedToLocation = redirectedToLocation;
    this.adapter.visitRequestCompleted(this);
  }

  requestFailedWithStatusCode(statusCode: number, response?: string) {
    this.response = response;
    this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
  }

  requestFinished() {
    this.recordTimingMetric(TimingMetric.requestEnd);
    this.adapter.visitRequestFinished(this);
  }
  */

  // Scrolling

  performScroll = () => {
    if (!this.scrolled) {
      if (this.action == "restore") {
        this.scrollToRestoredPosition() || this.scrollToTop();
      } else {
        this.scrollToAnchor() || this.scrollToTop();
      }
      this.scrolled = true;
    }
  };

  scrollToRestoredPosition() {
    const position = this.restorationData
      ? this.restorationData.scrollPosition
      : undefined;
    if (position) {
      this.controller.scrollToPosition(position);
      return true;
    }
  }

  scrollToAnchor() {
    if (this.location.anchor != null) {
      this.controller.scrollToAnchor(this.location.anchor);
      return true;
    }
  }

  scrollToTop() {
    this.controller.scrollToPosition({ x: 0, y: 0 });
  }

  // Instrumentation

  recordTimingMetric(metric: TimingMetric) {
    this.timingMetrics[metric] = new Date().getTime();
  }

  getTimingMetrics(): TimingMetrics {
    return { ...this.timingMetrics };
  }

  // Private

  getHistoryMethodForAction(action: Action) {
    switch (action) {
      case "replace":
        return this.controller
          .replaceHistoryWithLocationAndRestorationIdentifier;
      case "advance":
      case "restore":
        return this.controller.pushHistoryWithLocationAndRestorationIdentifier;
    }
  }
  shouldIssueRequest() {
    return this.action == "restore" ? !this.hasCachedSnapshot() : true;
  }

  cacheSnapshot() {
    if (!this.snapshotCached) {
      this.controller.cacheSnapshot();
      this.snapshotCached = true;
    }
  }

  render(callback: () => Promise<void>) {
    this.cancelRender();
    this.frame = requestAnimationFrame(() => {
      delete this.frame;
      callback.call(this);
    });
  }

  cancelRender() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      delete this.frame;
    }
  }
}
