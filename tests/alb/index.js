const proxy = require("redbird")({ port: 5050 });

const LEGACY_URL = "http://localhost:5557";
const BIFROST_URL = "http://localhost:5555";
const BIFROST_PATHS = [
  "/bifrost-assets",
  "/vite-page",
  "/custom",
  "/custom-incorrect",
  "/react-body-script-injection",
  "/head-test",
  "/navigation-test",
  "/slow-page",
  "/this-is-a-custom-route",
  "/broken-page",
  "/json-route",
  "/body-test",
];

proxy.addResolver((host, url, req) => {
  const segment = "/" + new URL(url, BIFROST_URL).pathname.split("/")[1];
  return BIFROST_PATHS.some((path) => segment === path)
    ? BIFROST_URL
    : LEGACY_URL;
});
