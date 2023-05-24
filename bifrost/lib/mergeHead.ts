import { dispatchTurbolinks } from "./dispatchTurbolinks";
import { activateNewBodyScriptElements, createScriptElement } from "./domUtils";

interface ElementDetails {
  tracked: boolean;
}
const allHeadScriptsEverRun: { [outerHTML: string]: ElementDetails } = {};
let firstLoad = true;

// takes in innerHTML of head
export function mergeHead(head: string) {
  const parsed = document.createRange().createContextualFragment(head); // Create a 'tiny' document and parse the html string
  const newHead = categorizeHead(parsed);
  const oldHead = categorizeHead(document.head);

  if (!trackedScriptsIdentical(oldHead.scripts, newHead.scripts)) {
    window.location.reload();
  }

  if (firstLoad) {
    // TODO: messy code
    for (const element of oldHead.scripts) {
      allHeadScriptsEverRun[element.outerHTML] = {
        tracked: elementIsTracked(element),
      };
    }
    firstLoad = false;
  }

  copyNewHeadStylesheetElements(newHead.stylesheets, oldHead.stylesheets);
  removeCurrentHeadProvisionalElements(oldHead.provisional);
  copyNewHeadProvisionalElements(newHead.provisional);
  copyNewHeadScriptElements(newHead.scripts);
}

function trackedScriptsIdentical(prev: Element[], next: Element[]) {
  return (
    prev
      .filter(elementIsTracked)
      .map((s) => s.outerHTML)
      .join() ===
    next
      .filter(elementIsTracked)
      .map((s) => s.outerHTML)
      .join()
  );
}

function copyNewHeadStylesheetElements(next: Element[], prev: Element[]) {
  const existing = prev.map((s) => s.outerHTML);
  for (const element of next) {
    if (!existing.includes(element.outerHTML)) {
      document.head.appendChild(element);
    }
  }
}

function copyNewHeadScriptElements(next: Element[]) {
  let blockingLoaded: boolean[] = [];
  function dispatch() {
    const scripts = document.body
      .querySelector("#proxied-body")!
      .querySelectorAll("script");

    // TODO: maybe this goes in onTransitionEnd? Need to test.
    activateNewBodyScriptElements(Array.from(scripts));
    focusFirstAutofocusableElement();

    dispatchTurbolinks("turbolinks:render", {});
    dispatchTurbolinks("turbolinks:load", { url: window.location.href });
  }
  for (const element of next as HTMLScriptElement[]) {
    const runBefore = element.outerHTML in allHeadScriptsEverRun;
    if (!runBefore) {
      let cb;
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
      document.head.appendChild(createScriptElement(element, cb));
      allHeadScriptsEverRun[element.outerHTML] = {
        tracked: elementIsTracked(element),
      };
    }
  }
  if (blockingLoaded.length === 0) {
    //TODO: raf waits for react to run... not 100% sure of the reliability
    requestAnimationFrame(() => requestAnimationFrame(dispatch));
  }
}

function removeCurrentHeadProvisionalElements(prev: Element[]) {
  for (const element of prev) {
    document.head.removeChild(element);
  }
}

function copyNewHeadProvisionalElements(next: Element[]) {
  for (const element of next) {
    document.head.appendChild(element);
  }
}

function focusFirstAutofocusableElement() {
  const element = document.body.querySelector("[autofocus]");
  if (element && "focus" in element && typeof element.focus === "function") {
    element.focus();
  }
}

function elementIsTracked(element: Element) {
  return element.getAttribute("data-turbolinks-track") == "reload";
}

function elementIsScript(element: Element) {
  const tagName = element.tagName.toLowerCase();
  return tagName == "script";
}

function elementIsStylesheet(element: Element) {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName == "style" ||
    (tagName == "link" && element.getAttribute("rel") == "stylesheet")
  );
}

function categorizeHead(head: ParentNode) {
  const scripts = [];
  const stylesheets = [];
  const provisional = [];
  for (const element of head.children) {
    if (elementIsScript(element)) {
      scripts.push(element);
    } else if (elementIsStylesheet(element)) {
      stylesheets.push(element);
    } else {
      provisional.push(element);
    }
  }
  return { scripts, stylesheets, provisional };
}
