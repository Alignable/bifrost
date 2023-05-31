
export default function onBeforeRoute(_pageContext: any) {
  const snapshot =
    typeof window !== "undefined" &&
    window.Turbolinks.controller.currentVisit?.getCachedSnapshot();
  if (!!snapshot) {
    return {
      pageContext: {
        snapshot,
        _pageId: "/proxy/pages/restorationVisit",
      },
    };
  } else {
    return undefined;
  }
}
