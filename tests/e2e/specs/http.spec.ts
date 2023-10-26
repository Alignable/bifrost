import { test, expect } from "@playwright/test";

test.describe("requests", () => {
  test("it proxies non-html requests", async ({ request }) => {
    const req = await request.get("/hello.js");
    expect(await req.text()).toEqual("console.log('hello')");
    expect(req.headers()["content-type"]).toEqual(
      "application/javascript; charset=utf-8"
    );
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
      const req = await request.get("./custom");
      expect(req.headers()["x-test-pageid"]).toBe("/proxy/pages");
    });

    test("returns original page id on error pages", async ({ request }) => {
      const req = await request.get("./broken-page");
      expect(req.headers()["x-test-pageid"]).toBe("/pages/broken-page");
    });
  });
});
