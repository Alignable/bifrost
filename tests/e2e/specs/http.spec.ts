import { test, expect, APIResponse } from "@playwright/test";
import { toPath } from "../../fake-backend/page-builder";

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
        "x-test-pageid": "/pages/proxy/passthru",
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

  test.describe("diagnostics attached to req", () => {
    function diagnostics(req: APIResponse) {
      return {
        status: req.status(),
        pageId: req.headers()["x-test-pageid"],
        layout:
          req.headers()["x-test-layout"]?.split(",").filter(Boolean) || [],
        proxyMode:
          req.headers()["x-test-proxymode"] &&
          JSON.parse(req.headers()["x-test-proxymode"]),
        sentProxyHeaders: req.headers()["x-test-sent-proxy-headers"] === "1",
      };
    }

    test("vite page sets pageId", async ({ request }) => {
      const req = await request.get("./vite-page");
      expect(diagnostics(req)).toEqual({
        status: 200,
        pageId: "/pages/vite-page",
        layout: [],
        proxyMode: false,
        sentProxyHeaders: false,
      });
    });

    test("when no route matches at all", async ({ request }) => {
      const req = await request.get("./jsaidofjasidofjasoidf");
      expect(diagnostics(req)).toEqual({
        status: 404,
        pageId: undefined,
        layout: [],
        proxyMode: undefined,
        sentProxyHeaders: false,
      });
    });

    test("on passthru, undefined pageId and layout", async ({ request }) => {
      const req = await request.get(
        toPath({ endpoint: "custom-incorrect", title: "a" })
      );
      expect(diagnostics(req)).toEqual({
        status: 200,
        pageId: undefined,
        layout: [],
        proxyMode: "passthru",
        sentProxyHeaders: false,
      });
    });

    test("wrapped with layout", async ({ request }) => {
      const req = await request.get(toPath({ title: "a" }));
      expect(diagnostics(req)).toEqual({
        status: 200,
        pageId: "/pages/proxy/wrapped",
        layout: ["main_nav"],
        proxyMode: "wrapped",
        sentProxyHeaders: true,
      });
    });

    test("wrapped with no layout", async ({ request }) => {
      const req = await request.get(toPath({ title: "a", layout: "" }));
      expect(diagnostics(req)).toEqual({
        status: 200,
        pageId: undefined,
        layout: [],
        proxyMode: "passthru",
        sentProxyHeaders: true,
      });
    });

    test.skip("returns original page id on error pages", async ({
      request,
    }) => {
      const req = await request.get("./broken-page");
      expect(req.headers()["x-test-pageid"]).toBe("/pages/broken-page");
    });
  });

  test.describe("wrapped xhr", () => {
    test("passes through script response", async ({ request }) => {
      const req = await request.get("/script-wrapped", {
        headers: { Accept: "text/html" },
      });
      expect(req.status()).toBe(200);
      expect(await req.text()).toEqual(
        "<script>console.log('script-only')</script>"
      );
    });

    test("passes through JSON response", async ({ request }) => {
      // important to set accept */* to allow the wrapped proxy
      const req = await request.get("/json-wrapped", {
        headers: { Accept: "application/json */*" },
      });
      expect(req.status()).toBe(200);
      expect(await req.json()).toEqual({ data: true });
    });
  });
});
