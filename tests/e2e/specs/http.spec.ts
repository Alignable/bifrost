import { test, expect } from "@playwright/test";

test.describe("requests", () => {
  test("it proxies non-html requests", async ({ request }) => {
    const req = await request.get("/hello.js");
    expect(await req.text()).toEqual("console.log('hello')");
    expect(req.headers()["content-type"]).toEqual(
      "application/javascript; charset=utf-8"
    );
  });

  test.describe("HEAD request", () => {
    test("returns headers for vite page", async ({ request }) => {
      const req = await request.head("./vite-page");
      expect(req.headers()).toMatchObject({
        "x-test-pageid": "/pages/vite-page",
      });
      expect(req.headers()).not.toMatchObject({
        "x-test-fake-backend": "1",
      });
    });

    test("returns headers for proxied page", async ({ request }) => {
      const req = await request.head("./custom-incorrect");
      expect(req.headers()).toMatchObject({
        "x-test-pageid": "/proxy/pages/passthru",
        // hits old backend
        "x-test-fake-backend": "1",
      });
    });
  });

  test.describe("onError", () => {
    test("returns header that we set in onError", async ({ request }) => {
      const req = await request.get("./broken-page");
      expect(req.headers()["x-test-onerror"]).toBe("true");
    });
  });

  test.describe("req.bifrostPageId", () => {
    test("returns page id", async ({ request }) => {
      const req = await request.get("./vite-page");
      expect(req.headers()["x-test-pageid"]).toBe("/pages/vite-page");
    });

    test("returns undefined when no route matches at all", async ({
      request,
    }) => {
      const req = await request.get("./jsaidofjasidofjasoidf");
      expect(req.headers()["x-test-pageid"]).toBe(undefined);
    });

    test("returns wrapped proxy route when hit", async ({ request }) => {
      const req = await request.get("./json-route");
      expect(req.headers()["x-test-pageid"]).toBe("/proxy/pages/wrapped");
    });

    test("returns passthru proxy route when hit", async ({ request }) => {
      const req = await request.get("./custom-incorrect");
      expect(req.headers()["x-test-pageid"]).toBe("/proxy/pages/passthru");
    });

    test.skip("returns original page id on error pages", async ({
      request,
    }) => {
      const req = await request.get("./broken-page");
      expect(req.headers()["x-test-pageid"]).toBe("/pages/broken-page");
    });
  });
});
