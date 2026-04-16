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

    test("wrapped proxy preserves 404 from backend", async ({ request }) => {
      const req = await request.get("/not-found");
      expect(diagnostics(req)).toEqual({
        status: 404,
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

    test("wrapped with error in layout", async ({ request }) => {
      const req = await request.get(toPath(
        {
          title: "SSR Error",
          layout: "ssr_error",
          content: "proxied content here",
        }
        ));
      expect(diagnostics(req)).toEqual({
        status: 500,
        pageId: "/pages/_error",
        layout: ["ssr_error"],
        proxyMode: "wrapped",
        sentProxyHeaders: true,
      });
    });

    test("HEAD request on vite-page", async ({ request }) => {
      const req = await request.head("./vite-page");
      expect(diagnostics(req)).toEqual({
        status: 200,
        pageId: "/pages/vite-page",
        layout: [],
        proxyMode: false,
        sentProxyHeaders: false,
      });
      expect(req.headers()).not.toMatchObject({
        "x-test-fake-backend": "1",
      });
    });

    test("HEAD request on proxied page", async ({ request }) => {
      const req = await request.head(
        toPath({ endpoint: "custom-incorrect", title: "a" })
      );
      expect(diagnostics(req)).toEqual({
        status: 200,
        pageId: undefined,
        layout: [],
        proxyMode: "passthru",
        sentProxyHeaders: false,
      });
      // hits old backend
      expect(req.headers()["x-test-fake-backend"]).toBe("1");
    });

    test.skip("returns original page id on error pages", async ({
      request,
    }) => {
      const req = await request.get("./broken-page");
      expect(req.headers()["x-test-pageid"]).toBe("/pages/broken-page");
    });
  });

  test.describe("layoutHeaders", () => {
    test("strips layoutHeaders from wrapped response", async ({ request }) => {
      const req = await request.get(toPath({ title: "a" }));
      expect(req.headers()["x-react-layout"]).toBeUndefined();
      expect(req.headers()["x-react-current-nav"]).toBeUndefined();
    });

    test("does not strip headers on passthru response", async ({ request }) => {
      const req = await request.get(
        toPath({ endpoint: "custom-incorrect", title: "a" })
      );
      // passthru routes don't go through the wrapped render path, so headers pass through
      expect(req.headers()["x-test-fake-backend"]).toBe("1");
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
