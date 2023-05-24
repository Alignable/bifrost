import { getSnapshot } from "../lib/snapshots.js";

export default function onBeforeRoute(_pageContext: any) {
  const snapshot = getSnapshot();
  if (!!snapshot?.proxySendClient) {
    return {
      pageContext: {
        ...snapshot,
        _pageId: "/proxy/pages/restorationVisit",
      },
    };
  } else {
    return undefined;
  }
}
