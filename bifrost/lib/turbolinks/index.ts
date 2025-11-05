import { mergeHead } from "./mergeHead";
import { Controller, VisitOptions } from "./controller";
import { Locatable } from "./location";
import {
  activateNewBodyScriptElements,
  focusFirstAutofocusableElement,
} from "./util";

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
  async _vikeBeforeRender(beforeRenderFn?: () => void): Promise<void> {
    if (controller.currentVisit) {
      const { currentVisit } = controller;

      return new Promise((resolve) => {
        currentVisit.renderFn = () => {
          beforeRenderFn?.();
          controller.viewWillRender(); // turbolinks:before-render
          resolve();
        };

        controller.adapter.visitRequestCompleted(currentVisit);
        controller.adapter.visitRequestFinished(currentVisit);
      });
    } else {
      console.error(
        "controller.currentVisit should exist when onRenderClient fires"
      );
    }
  },

  async _vikeAfterRender(activateBody: boolean) {
    if (controller.currentVisit) {
      if (activateBody) {
        activateNewBodyScriptElements(
          Array.from(document.body.querySelectorAll("script"))
        );
      }

      focusFirstAutofocusableElement();

      controller.viewRendered(); // turbolinks:render
      controller.adapter.visitRendered(controller.currentVisit);
      controller.currentVisit.complete(); // turbolinks:load
    } else {
      console.error(
        "controller.currentVisit should exist when onAfterRenderClient fires"
      );
    }
  },
};

export type Turbolinks = typeof Turbolinks;
