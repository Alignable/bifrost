import { createScriptElement } from "../domUtils.js";

interface ElementDetails {
  tracked: boolean;
}
const allHeadScriptsEverRun: { [outerHTML: string]: ElementDetails } = {};
let firstLoad = true;
let lastTrackedScriptSignature: string;

export async function mergeHead(
  head: HTMLHeadElement,
  trackScripts: boolean,
  onTrackedScriptsChanged: () => void
) {
  const newHead = categorizeHead(head);
  const oldHead = categorizeHead(document.head);

  if (trackScripts) {
    lastTrackedScriptSignature =
      lastTrackedScriptSignature ||
      trackedElementSignature([...oldHead.scripts, ...oldHead.stylesheets]);
    if (
      lastTrackedScriptSignature !==
      trackedElementSignature([...newHead.scripts, ...oldHead.stylesheets])
    ) {
      onTrackedScriptsChanged();
    }
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

  return new Promise<void>((resolve) => {
    copyNewHeadScriptElements(newHead.scripts, resolve);
  });
}

function trackedElementSignature(scripts: Element[]) {
  return scripts
    .filter(elementIsTracked)
    .map((s) => s.outerHTML)
    .join();
}

function copyNewHeadStylesheetElements(next: Element[], prev: Element[]) {
  const existing = prev.map((s) => s.outerHTML);
  for (const element of next) {
    if (!existing.includes(element.outerHTML)) {
      document.head.appendChild(element);
    }
  }
}

function copyNewHeadScriptElements(
  next: Element[],
  onScriptsLoaded: () => void
) {
  let blockingLoaded: boolean[] = [];
  function dispatch() {
    onScriptsLoaded();
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
    // //TODO: raf waits for react to finish... not 100% sure of the reliability
    requestAnimationFrame(dispatch);
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
