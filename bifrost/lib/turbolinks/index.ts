import { mergeHead } from "./mergeHead";
import { Controller, VisitOptions } from "./controller";
import { Locatable } from "./location";
import {
  activateNewBodyScriptElements,
  focusFirstAutofocusableElement,
} from "./util";
import { Visit } from "./visit";

const controller = new Controller();

export const Turbolinks = {
  get supported() {
    return true;
  },

  controller,

  visit(location: Locatable, options?: Partial<VisitOptions>) {
    controller.visit(location, options);
  },

  clearCache() {
    controller.clearCache();
  },

  setProgressBarDelay(delay: number) {
    controller.setProgressBarDelay(delay);
  },

  start() {
    if (window.Turbolinks?.controller?.started) return;

    // because this runs after ios hooks, we have to recover. See onRenderHtml
    if (
      window.Turbolinks !== Turbolinks &&
      window.Turbolinks?.controller?.adapter
    ) {
      (window.Turbolinks.controller.adapter as any).controller = controller;
      controller.adapter = window.Turbolinks.controller.adapter;
    }
    // Tells vike not to do link interception
    (window as any)._disableAutomaticLinkInterception = true;
    window.Turbolinks = Turbolinks;
    controller.start();
  },

  _vpsCachePageContext(pageContext: any) {
    controller.pageContext = pageContext;
  },

  // Returns promise for turbolinks to be ready to render (runs requestAnimationFrame internally)
  async _vikeBeforeRender(
    visit: Visit | undefined,
    errorWhileRendering: unknown,
    beforeRenderFn?: () => void
  ): Promise<void> {
    if ((!visit || visit.state === "completed") && !errorWhileRendering) {
      throw new Error(
        `Bifrost does not support calling navigate() directly. Use navigate from "@alignable/bifrost" or Turbolinks.visit() instead.`
      );
    }
    if (visit) {
      return new Promise((resolve) => {
        visit.cancelFn = () => resolve();
        visit.renderFn = () => {
          beforeRenderFn?.();
          controller.viewWillRender(); // turbolinks:before-render
          resolve();
        };

        controller.adapter.visitRequestCompleted(visit);
        controller.adapter.visitRequestFinished(visit);
      });
    } else {
      console.error("visit should exist when onBeforeRenderClient fires");
    }
  },

  async _vikeAfterRender(visit: Visit | undefined, activateBody: boolean) {
    if (visit) {
      if (activateBody) {
        activateNewBodyScriptElements(
          Array.from(document.body.querySelectorAll("script"))
        );
      }

      focusFirstAutofocusableElement();

      controller.viewRendered(); // turbolinks:render
      controller.adapter.visitRendered(visit);
      visit.complete(); // turbolinks:load
    } else {
      console.error("visit should exist when onAfterRenderClient fires");
    }
  },
};

export type Turbolinks = typeof Turbolinks;
