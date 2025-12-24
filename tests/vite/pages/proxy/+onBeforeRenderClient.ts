export default async function onBeforeRenderClient() {
  // mocks a slow onBeforeRenderClient that forces a gap between bifrosts' onBeforeRenderClient and React rendering.
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });
  });
}
