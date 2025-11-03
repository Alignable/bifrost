import { navigate } from "vike/client/router";
import { Adapter } from "./adapter";
import { Controller } from "./controller.js";
import { Location } from "./location";
import { Action } from "./types";
import { uuid } from "./util";

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

  frame?: number;
  location: Location;
  progress = 0;
  referrer?: Location;
  redirectedToLocation?: Location;
  snapshotCached = false;
  state = VisitState.initialized;

  requestInFlight = false;
  renderFn?: () => void;

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
        const url = new URL(
          this.location.toString(),
          this.location.getOrigin()
        );
        navigate(url.pathname + url.hash + url.search, {
          overwriteLastHistoryEntry: this.action === "replace",
        }).catch(console.error);
        this.progress = 0;
        this.requestInFlight = true;
      }
    }
  }

  getCachedSnapshot() {
    const snapshot = this.controller.getCachedSnapshotForLocation(
      this.location
    );
    if (snapshot) {
      if (this.action == "restore") {
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
  }

  loadResponse() {
    this.render(() => {
      if (!this.renderFn)
        throw new Error("Render details not set before rendering");
      this.cacheSnapshot();
      this.renderFn();
    });
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

  // Instrumentation

  recordTimingMetric(metric: TimingMetric) {
    this.timingMetrics[metric] = new Date().getTime();
  }

  getTimingMetrics(): TimingMetrics {
    return { ...this.timingMetrics };
  }

  // Private

  shouldIssueRequest() {
    return this.action == "restore" ? !this.hasCachedSnapshot() : true;
  }

  cacheSnapshot() {
    if (!this.snapshotCached) {
      this.controller.cacheSnapshot();
      this.snapshotCached = true;
    }
  }

  render(callback: () => void) {
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
