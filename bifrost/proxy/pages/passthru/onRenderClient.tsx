export default async function onRenderClient() {
  // Passthru pages are unhandled by bifrost, reload to grab legacy content from server
  window.location.reload();
}
