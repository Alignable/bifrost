import { activateNewBodyScriptElements } from "../domUtils";
import { mergeHead } from "../mergeHead";
import { Controller, VisitOptions } from "./controller";
import { Locatable } from "./location";
import { Renderer } from "./renderer";
import { focusFirstAutofocusableElement } from "./util";

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

  _vpsCachePageContext(pageContext: any) {
    controller.pageContext = pageContext;
  },

  _vpsWriteRestorationIdentifier() {
    controller.restorationIdentifier
  },

  _vpsOnRenderClient(
    newHead: HTMLHeadElement,
    renderBody: () => void
  ) {
    if (controller.currentVisit) {
      const { currentVisit } = controller;
      // TODO: handle render.shouldRender logic
      // TODO: move to controller?
      currentVisit.renderFn = async () => {
        const scriptsLoaded = mergeHead(newHead);

        controller.viewWillRender();
        renderBody();
        await scriptsLoaded;

        activateNewBodyScriptElements(
          Array.from(document.body.querySelectorAll("script"))
        );
        focusFirstAutofocusableElement();
        currentVisit.performScroll();

        controller.viewRendered();
        controller.adapter.visitRendered(currentVisit);
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
