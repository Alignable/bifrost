/**
 * Hard navigate to a URL using `history.pushState` and `window.location.reload` instead of
 * `window.location.href`. This prevents the mobile apps from opening the URL in a browser tab.
 */
export async function hardNavigate(url: string): Promise<never> {
  history.pushState(null, "", url);
  window.Turbolinks.controller.viewInvalidated();
  // stop vike rendering to let navigation happen
  await new Promise(() => {});
}
