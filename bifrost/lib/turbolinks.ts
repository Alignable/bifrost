import turbolinks from "turbolinks";
import { type Locatable } from "turbolinks/dist/location";
import { type Action } from "turbolinks/dist/types";
import { type Adapter } from "turbolinks/dist/adapter";
import { Visit as TVisit } from "turbolinks/dist/visit";
import { v4 as uuidv4 } from "uuid";
import { PageContextProxyClient } from "../types/internal.js";
import { dispatchTurbolinks } from "./dispatchTurbolinks.js";
import { LruCache } from "./lruCache.js";
import { navigate } from "vite-plugin-ssr/client/router";

// The bare neccessities for turbolinks-ios to hook into.

interface Controller {
  restorationIdentifier: string;
  currentVisit?: Visit;
  adapter: Adapter;
  startVisitToLocationWithAction: (
    location: Locatable,
    action: Action,
    restorationIdentifier: string
  ) => void;
}

// This could be a class, but then down in setupTurbolinks we'd have to merge its prototype into placeholder.controller since turbolinks-ios grabs a reference to the controller...
const controller: Controller = {
  restorationIdentifier: "",
  startVisitToLocationWithAction(
    location: Locatable,
    action: Action,
    restorationIdentifier: string
  ) {
    // NOTE: somehow identifier needs to be picked up from ios. it sets (pending) identifier.
    //    it seems the identifier is set in didStartVisitWithIdentifier, but that is not getting called.
    const url = new URL(location.toString(), window.location.href);
    navigate(url.pathname + url.hash + url.search, {
      overwriteLastHistoryEntry: action === "replace",
    }).catch(console.error);
  },
  adapter: {
    visitProposedToLocationWithAction(location, action) {
      controller.startVisitToLocationWithAction(location, action, uuidv4());
    },
  } as Adapter,
};

// Absolute garbage fake turbolinks location needed for ios.
class Location {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  get absoluteURL(): string {
    return this.url;
  }
  toString() {
    return this.url;
  }
}

export const Turbolinks = {
  initialRestoration: "",
  controller,
  visit: function (location, options?): void {
    const url = new URL(location.toString(), window.location.href);
    console.log("turbolinks visit");
    if (url.host !== window.location.host) {
      window.location.href = url.href;
    } else {
      window.Turbolinks.controller.adapter.visitProposedToLocationWithAction(
        new Location(location.toString()) as unknown as Locatable, // TODO: This is shit
        options?.action || "advance"
      );
    }
  } as (typeof turbolinks)["visit"],
};

type Snapshot = Pick<
  Extract<PageContextProxyClient, { isHydration: false }>,
  "proxySendClient" | "layout" | "layoutProps"
>;

const snapshots = new LruCache<Snapshot>(10);

// let lastRestorationIdentifier: string;

export function writeRestorationIdentifier(
  pageContext: PageContextProxyClient
) {
  if (history.state.restorationIdentifier) {
    return;
  }
  Turbolinks.controller.restorationIdentifier ||= Turbolinks.initialRestoration;
  Turbolinks.initialRestoration = "";
  history.replaceState(
    {
      restorationIdentifier: Turbolinks.controller.restorationIdentifier,
      ...history.state,
    },
    ""
  );
  snapshots.put(Turbolinks.controller.restorationIdentifier, {
    layout: pageContext.layout,
    layoutProps: pageContext.layoutProps,
  });
}

/*
this is not working rn because we need to put the restoration identifier onto the history stack BEFORE navigate calls pushState
otherwise it is too late and we can only modify the new page's state...

what if we add the restoration identifier on page load?
how does react history state libs do it?
*/
export function cacheProxiedBody() {
  if (document.getElementById("proxied-body")) {
    dispatchTurbolinks("turbolinks:before-cache", {});

    const bodyAttrs: Record<string, string> = {};
    document.body.getAttributeNames().forEach((name) => {
      bodyAttrs[name] = document.body.getAttribute(name)!;
    }, {});
    snapshots.put(Turbolinks.controller.restorationIdentifier, {
      ...snapshots.get(Turbolinks.controller.restorationIdentifier)!,
      proxySendClient: {
        head: document.head.innerHTML,
        body: document.getElementById("proxied-body")!.innerHTML,
        bodyAttrs,
      },
    });
  }
}

const onBrowser = typeof window !== "undefined";
export function getSnapshot(): Snapshot | undefined {
  if (!onBrowser) return;
  return snapshots.get(history.state.restorationIdentifier);
}

interface TurbolinksPlaceholder {
  controller: {
    restorationIdentifier: string;
    adapter: {
      controller: any;
    };
  };
  p: 1;
}

export function getAdapter(): Adapter | undefined {
  console.trace();
  console.log("adapter", window.Turbolinks.controller.adapter);
  return window.Turbolinks.controller.adapter;
}

export class Visit {
  readonly identifier: string;
  restorationIdentifier: string;
  constructor() {
    this.restorationIdentifier = uuidv4();
    this.identifier = uuidv4();
  }
  issueRequest() {}
  changeHistory() {}
  loadCachedSnapshot() {
    getAdapter()?.visitRendered(this as unknown as TVisit);
  }
  hasCachedSnapshot() {
    return false; //TODO
  }
  loadResponse() {
    getAdapter()?.visitRendered(this as unknown as TVisit);
  }
  cancel() {}
}

export function setupTurbolinks() {
  console.log("settinsasdfg up1");
  if (typeof window !== "undefined" && window.Turbolinks !== Turbolinks) {
    console.log("settinsasdfg up");

    // turbolinks-ios messes with our stuff before vite has a chance to mount. so we put in a placeholder (onRenderHtml)
    // now that vite mounts, we replace placholder with our actual turbolinks.
    // an alternative solution could be to pull out our fake-turbolinks lib into a blocking head script.
    // https://github.com/turbolinks/turbolinks-ios/blob/1c891b9ffbb89666a05b7c5b02a8fdd700e92323/Turbolinks/WebView.js#L10
    const placeholder = window.Turbolinks as unknown as TurbolinksPlaceholder;
    Turbolinks.initialRestoration =
      placeholder.controller.restorationIdentifier;
    Turbolinks.controller.adapter = placeholder.controller
      .adapter as unknown as Adapter;
    Turbolinks.controller = Object.assign(
      placeholder.controller,
      Turbolinks.controller
    );

    window.Turbolinks = Turbolinks;
  }
}
