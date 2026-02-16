/**
 * Hard redirect (full page reload) that converts same-origin URLs to relative paths.
 * Turbolinks IOS requires relative URLs to open within the mobile app instead of safari.
 */
export async function hardRedirect(url: string) {
  if (url.startsWith("/")) {
    window.location.href = url;
    await new Promise(() => {});
    return;
  }

  const parsedUrl = new URL(url);

  if (window.location.origin === parsedUrl.origin) {
    // Relative redirect
    window.location.href = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } else {
    // External redirect
    window.location.href = url;
  }

  // stop vike rendering to let navigation happen
  await new Promise(() => {});
}
