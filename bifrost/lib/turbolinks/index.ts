import { Controller, VisitOptions } from "./controller";
import { Locatable } from "./location";
import { Renderer } from "./renderer";

const controller = new Controller();

export const Turbolinks = {
  get supported() {
    return Controller.supported;
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
      window.Turbolinks.controller.adapter
    ) {
      window.Turbolinks.controller.adapter.controller = controller;
      controller.adapter = window.Turbolinks.controller.adapter;
    }
    window.Turbolinks = Turbolinks;
    controller.start();
  },

  _vpsRenderClientWith(renderer: Renderer) {
    if (controller.currentVisit) {
      // TODO: move to controller
      controller.currentVisit.renderer = renderer;
      controller.adapter.visitRequestCompleted(controller.currentVisit);
      controller.adapter.visitRequestFinished(controller.currentVisit);
    } else {
      console.error(
        "controller.currentVisit should exist when onRenderClient fires"
      );
    }
  },

  _vpsOnRenderClient(renderFn: () => Promise<void>) {
    if (controller.currentVisit) {
      // TODO: move to controller
      controller.currentVisit.renderFn = async () => {
        controller.viewWillRender();
        await renderFn();
        controller.viewRendered();
      };
      controller.adapter.visitRequestCompleted(controller.currentVisit);
      controller.adapter.visitRequestFinished(controller.currentVisit);
    } else {
      console.error(
        "controller.currentVisit should exist when onRenderClient fires"
      );
    }
  },
};
