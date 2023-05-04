import { getSnapshot } from "../../lib/snapshots";


export default function onBeforeRoute(_pageContext: any) {
  const snapshot = getSnapshot();
  if (!!snapshot?.proxySendClient) {
    return {
      pageContext: {
        ...snapshot,
        _pageId: "terabithia/proxy/pages/restorationVisit",
      },
    };
  } else {
    return undefined;
  }
}
