import { navigate } from "vite-plugin-ssr/client/router";

// handle internal and external navigation
// returns whether or not we redirected
export function navigateAnywhere(
  to?: string,
  opts?: Parameters<typeof navigate>[1]
) {
  if (to) {
    const url = new URL(to, window.location.href);
    if (url.host !== window.location.host) {
      window.location.href = to;
    } else {
      navigate(url.pathname + url.hash + url.search, opts);
    }
  }
  return !!to;
}
