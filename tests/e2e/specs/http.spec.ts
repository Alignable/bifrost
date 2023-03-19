import { test, expect } from "@playwright/test";

test.describe("requests", () => {
  test("it proxies non-html requests", async ({ request }) => {
    const req = await request.get('/hello.js')
    expect(await req.text()).toEqual("console.log('hello')")
    expect(req.headers()['content-type']).toEqual("application/javascript; charset=utf-8")
  });
});
