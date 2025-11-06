import { createScriptElement } from "./util";

interface ElementDetails {
  tracked: boolean;
}
const allHeadScriptsEverRun: { [outerHTML: string]: ElementDetails } = {};
let firstLoad = true;
let lastTrackedScriptSignature: string;

// Returns function which resolves when all new blocking head scripts have loaded
export function mergeHead(head: HTMLHeadElement) {
  const newHead = categorizeHead(head);
  const oldHead = categorizeHead(document.head);
  const reload = () => window.Turbolinks.controller.viewInvalidated();

  if (
    head
      .querySelector('meta[name="turbolinks-visit-control"]')
      ?.getAttribute("content") === "reload"
  ) {
    reload();
  }

  lastTrackedScriptSignature =
    lastTrackedScriptSignature ||
    trackedElementSignature([...oldHead.scripts, ...oldHead.stylesheets]);
  if (
    lastTrackedScriptSignature !==
    trackedElementSignature([...newHead.scripts, ...newHead.stylesheets])
  ) {
    reload();
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

  return copyNewHeadScriptElements(newHead.scripts);
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

function copyNewHeadScriptElements(next: Element[]): () => Promise<void> {
  const deferredScripts: Element[] = [];
  let blockingLoaded: boolean[] = [];
  const scriptsLoadedPromise = new Promise<void>((onScriptsLoaded) => {
    for (const element of next as HTMLScriptElement[]) {
      const runBefore = element.outerHTML in allHeadScriptsEverRun;
      if (!runBefore) {
        let cb;
        if (!element.defer && element.src) {
          const idx = blockingLoaded.length;
          cb = () => {
            blockingLoaded[idx] = true;
            if (blockingLoaded.every((v) => v)) {
              onScriptsLoaded();
            }
          };
          blockingLoaded.push(false);
        }
        const newElement = createScriptElement(element, cb);
        if (element.defer) {
          deferredScripts.push(newElement);
        } else {
          document.head.appendChild(newElement);
        }
        allHeadScriptsEverRun[element.outerHTML] = {
          tracked: elementIsTracked(element),
        };
      }
    }
    if (blockingLoaded.length === 0) {
      // raf waits for react to finish
      onScriptsLoaded();
    }
  });
  return () => {
    deferredScripts.forEach((s) => document.head.appendChild(s));
    return scriptsLoadedPromise;
  };
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

function elementIsFavicon(element: Element) {
  const tagName = element.tagName.toLowerCase();

  return tagName == "link" && element.getAttribute("rel") == "icon";
}

function categorizeHead(head: ParentNode) {
  const scripts = [];
  const stylesheets = [];
  const provisional = [];
  for (const element of head.children) {
    // we want to keep the same favicon on page transitions
    if (elementIsFavicon(element)) {
      continue;
    }

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
