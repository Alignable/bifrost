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
});
