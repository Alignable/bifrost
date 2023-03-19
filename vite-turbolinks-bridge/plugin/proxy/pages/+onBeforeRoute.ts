import { getSnapshot } from "../../lib/snapshots";


export default function onBeforeRoute(_pageContext: any) {
  const snapshot = getSnapshot();
  if (!!snapshot) {
    console.log("onBeforeRoute: restorationIdentifier found", getSnapshot());
    return {
      pageContext: {
        ...snapshot,
        _pageId: "@vite-turbolinks-bridge/stem-plugin/proxy/pages/restorationVisit",
      },
    };
  } else {
    console.log("onBeforeRoute: no restorationIdentifier");
    return undefined;
  }
}
