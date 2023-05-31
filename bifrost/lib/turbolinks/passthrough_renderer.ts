import { HeadDetails } from "./head_details";
import { Renderer, RenderDelegate, RenderCallback } from "./renderer";
import { Snapshot } from "./snapshot";
import { array, createScriptElement, focusFirstAutofocusableElement } from "./util";

export type PermanentElement = Element & { id: string };

export type Placeholder = {
  element: Element;
  permanentElement: PermanentElement;
};

type BodyRenderer = () => void;

const allHeadScriptsEverRun: { [outerHTML: string]: boolean } = {};
let firstLoad = true;

export class PassthruRenderer extends Renderer {
  delegate?: RenderDelegate;
  readonly currentHeadDetails: HeadDetails;
  readonly newHeadDetails: HeadDetails;
  renderBody: BodyRenderer;

  constructor(
    currentHeadDetails: HeadDetails,
    newHeadDetails: HeadDetails,
    renderBody: BodyRenderer
  ) {
    super();
    this.currentHeadDetails = currentHeadDetails;
    this.newHeadDetails = newHeadDetails;
    this.renderBody = renderBody;
  }

  async render(delegate: RenderDelegate, callback: RenderCallback) {
    this.delegate = delegate;
    if (this.shouldRender()) {
      const scriptsLoaded = this.mergeHead();
      await this.renderView(async () => {
        this.renderBody();
        await scriptsLoaded;
        callback();
      });
    } else {
      this.invalidateView();
    }
  }

  async mergeHead() {
    if (firstLoad) {
      // TODO: messy code
      for (const [outerHTML, details] of Object.entries(
        this.currentHeadDetails.detailsByOuterHTML
      )) {
        allHeadScriptsEverRun[outerHTML] = true;
      }
    }
    firstLoad = false;

    return new Promise<void>((resolve) => {
      this.copyNewHeadStylesheetElements();
      this.copyNewHeadScriptElements(resolve);
      this.removeCurrentHeadProvisionalElements();
      this.copyNewHeadProvisionalElements();
    });
  }

  shouldRender() {
    return true;
  }

  trackedElementsAreIdentical() {
    return (
      this.currentHeadDetails.getTrackedElementSignature() ==
      this.newHeadDetails.getTrackedElementSignature()
    );
  }

  copyNewHeadStylesheetElements() {
    for (const element of this.getNewHeadStylesheetElements()) {
      document.head.appendChild(element);
    }
  }

  copyNewHeadScriptElements(onScriptsLoaded: () => void) {
    let blockingLoaded: boolean[] = [];
    const dispatch = () => {
      focusFirstAutofocusableElement();

      onScriptsLoaded();
    };
    for (const element of this.getNewHeadScriptElements()) {
      const runBefore = element.outerHTML in allHeadScriptsEverRun;
      if (!runBefore) {
        let cb: false | (() => void) = false;
        if (!element.defer && element.src) {
          const idx = blockingLoaded.length;
          cb = () => {
            blockingLoaded[idx] = true;
            if (blockingLoaded.every((v) => v)) {
              dispatch();
            }
          };
          blockingLoaded.push(false);
        }
        const script = createScriptElement(element);
        if (cb) {
          script.addEventListener("load", cb);
        }
        document.head.appendChild(script);
        allHeadScriptsEverRun[element.outerHTML] = true;
      }
    }
    if (blockingLoaded.length === 0) {
      // //TODO: raf waits for react to finish... not 100% sure of the reliability
      requestAnimationFrame(() => requestAnimationFrame(dispatch));
    }
  }

  removeCurrentHeadProvisionalElements() {
    for (const element of this.getCurrentHeadProvisionalElements()) {
      document.head.removeChild(element);
    }
  }

  copyNewHeadProvisionalElements() {
    for (const element of this.getNewHeadProvisionalElements()) {
      document.head.appendChild(element);
    }
  }

  getNewHeadStylesheetElements() {
    return this.newHeadDetails.getStylesheetElementsNotInDetails(
      this.currentHeadDetails
    );
  }

  getNewHeadScriptElements() {
    return this.newHeadDetails.getScriptElementsNotInDetails(
      this.currentHeadDetails
    ) as HTMLScriptElement[];
  }

  getCurrentHeadProvisionalElements() {
    return this.currentHeadDetails.getProvisionalElements();
  }

  getNewHeadProvisionalElements() {
    return this.newHeadDetails.getProvisionalElements();
  }
}
