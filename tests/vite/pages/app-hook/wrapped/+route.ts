import type { RouteSync } from "vike/types";

// Also takes over /custom-render-target after its page throws `render(url, { proxy: "wrapped" })`, like Alignable's renderWrapped
const route: RouteSync = ({ urlPathname, abortReason }) => {
  if (urlPathname === "/custom-app-hook") return true;
  const proxy = (abortReason as { proxy?: string } | undefined)?.proxy;
  return (
    urlPathname === "/custom-render-target" &&
    proxy === "wrapped" && { precedence: 100 }
  );
};

export default route;
