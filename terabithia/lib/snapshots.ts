import { PageContextProxyClient, Proxy } from "../types/internal";
import { dispatchTurbolinks } from "./dispatchTurbolinks";
import { v4 as uuidv4 } from "uuid";

type Snapshot = Pick<
  Extract<PageContextProxyClient, { isHydration: false }>,
  "proxySendClient" | "layout" | "layoutProps"
>;

// TODO: Check turbolinks but probably set a limit on # of pages to save
const snapshots: Record<string, Snapshot> = {};

let lastRestorationIdentifier: string;

export function writeRestorationIdentifier(
  pageContext: PageContextProxyClient
) {
  if (history.state.restorationIdentifier) {
    return;
  }
  lastRestorationIdentifier = uuidv4();
  history.replaceState(
    {
      restorationIdentifier: lastRestorationIdentifier,
      // these two could go in snapshot instead...
      ...history.state,
    },
    ""
  );
  snapshots[lastRestorationIdentifier] = {
    layout: pageContext.layout,
    layoutProps: pageContext.layoutProps,
  };
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
    snapshots[lastRestorationIdentifier] = {
      ...snapshots[lastRestorationIdentifier],
      proxySendClient: {
        head: document.head.innerHTML,
        body: document.getElementById("proxied-body")!.innerHTML,
        bodyAttrs,
      },
    };
  }
}
const onBrowser = typeof window !== "undefined";
export function getSnapshot(): Snapshot | undefined {
  if (!onBrowser) return;
  return snapshots[history.state.restorationIdentifier];
}
