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
      window.Turbolinks.controller.adapter
    ) {
      (window.Turbolinks.controller.adapter as any).controller = controller;
      controller.adapter = window.Turbolinks.controller.adapter;
    }
    // Tells vite-plugin-ssr not to do link interception
    (window as any)._disableAutomaticLinkInterception = true;
    window.Turbolinks = Turbolinks;
    controller.start();
  },

  _vpsCachePageContext(pageContext: any) {
    controller.pageContext = pageContext;
  },

  _vpsOnRenderClient(
    newHead: HTMLHeadElement,
    trackScripts: boolean,
    executeBodyScripts: boolean,
    renderBody: () => void
  ) {
    if (controller.currentVisit) {
      const { currentVisit } = controller;
      // TODO: move to controller?
      currentVisit.renderFn = async () => {
        const scriptsLoaded = mergeHead(newHead, trackScripts, () =>
          controller.viewInvalidated()
        );

        controller.viewWillRender();
        renderBody();
        await scriptsLoaded;

        if (executeBodyScripts) {
          activateNewBodyScriptElements(
            Array.from(document.body.querySelectorAll("script"))
          );
        }
        focusFirstAutofocusableElement();

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

export type Turbolinks = typeof Turbolinks;
