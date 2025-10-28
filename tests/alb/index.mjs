import { Redbird } from "redbird";

const LEGACY_URL = "http://localhost:5557";
const BIFROST_URL = `http://localhost:${process.env.BIFROST_PORT || 5555}`;
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
  "/",
];

console.log(
  `Proxying Bifrost requests to ${BIFROST_URL} and legacy to ${LEGACY_URL}`
);
console.log(`ALB up on http://localhost:5050`);

const proxy = new Redbird({ port: 5050, cluster: 1, keepAlive: true });
proxy.addResolver((host, url, req) => {
  if (req.headers["x-vite-proxy"]) return LEGACY_URL;

  const segment = "/" + new URL(url, BIFROST_URL).pathname.split("/")[1];
  return BIFROST_PATHS.some((path) => segment === path)
    ? BIFROST_URL
    : LEGACY_URL;
});
