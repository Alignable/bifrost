import { dispatchTurbolinks } from "./dispatchTurbolinks.js";
import { Turbolinks } from "./turbolinks.js";

// Stole all this from turbolinks

type Action = "advance" | "replace" | "restore";

function isAction(action: any): action is Action {
  return action == "advance" || action == "replace" || action == "restore";
}

// TODO: polyfilled closest may not be required. check caniuse?
const closest = (() => {
  const html = typeof window !== 'undefined' && document.documentElement;

  type MatchesSelector = (this: Element, selector: string) => boolean;
  const match: MatchesSelector =
    (html as any).matches ||
    (html as any).webkitMatchesSelector ||
    (html as any).msMatchesSelector ||
    (html as any).mozMatchesSelector;

  type Closest = (this: Element, selector: string) => Element | null;
  const closest: Closest =
    (html && html.closest) ||
    function (selector: string) {
      let element: Element | null = this;
      while (element) {
        if (match.call(element, selector)) {
          return element;
        } else {
          element = element.parentElement;
        }
      }
    };

  return function (element: Element, selector: string) {
    return closest.call(element, selector);
  };
})();

function elementIsVisitable(element: Element) {
  const container = closest(element, "[data-turbolinks]");
  if (container) {
    return container.getAttribute("data-turbolinks") != "false";
  } else {
    return true;
  }
}

function getVisitableLinkForTarget(target: EventTarget | null): Element | null {
  if (target instanceof Element && elementIsVisitable(target)) {
    return closest(target, "a[href]:not([target]):not([download])");
  }
  return null;
}

// stolen from turbolinks controller.ts
function clickEventIsSignificant(event: MouseEvent) {
  return !(
    (event.target && (event.target as any).isContentEditable) ||
    event.defaultPrevented ||
    event.which > 1 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  );
}

function getActionForLink(link: Element): Action {
  const action = link.getAttribute("data-turbolinks-action");
  return isAction(action) ? action : "advance";
}

export function turbolinksClickListener(event: MouseEvent) {
  if (clickEventIsSignificant(event)) {
    const link = getVisitableLinkForTarget(event.target);
    if (link) {
      const location = link.getAttribute("href") || "";
      if (location) {
        const action = getActionForLink(link);
        event.preventDefault();
        // TODO: technically canceling these events should do various things, but afaict we never do that in alignableweb
        dispatchTurbolinks("turbolinks:click", { url: location }, link);
        dispatchTurbolinks("turbolinks:before-visit", { url: location });
        dispatchTurbolinks("turbolinks:visit", { url: location });
        Turbolinks.visit(location, {action})
      }
    }
  }
}
