import { test, expect, Page } from "@playwright/test";
import {
  ensureAllNetworkSucceeds,
  expectNoMoreScripts,
  ensureNoBrowserNavigation,
  storeConsoleLog,
  validateDOMOnTurbolinks,
  StringMatcher,
  sleep,
  ensureBrowserNavigation,
  waitForTurbolinksInit,
} from "../helpers/test-helpers";
import { CustomProxyPage } from "../helpers/custom-proxy-page";
import { Turbolinks as T } from "../../fake-backend/page-builder";

test.describe("pages", () => {
  test.beforeEach(async ({ page }) => {
    ensureAllNetworkSucceeds(page);
  });
  test("it proxies pages without layouts", async ({ page }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "page",
      layout: "",
      content: "lorem ipsum",
    });
    await customProxy.goto({ waitFor: 0 });

    await expect(page).toHaveTitle("page");
    // only content on page is the lorem ipsum - nothing added by layout
    expect(page.locator("body")).toContainText("lorem ipsum");
    await expect(page.locator("nav")).toHaveCount(0);
  });

  test("it proxies pages with layouts", async ({ page }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "visitor page",
      layout: "visitor",
      content: "lorem ipsum",
    });
    await customProxy.goto();
    await expect(page).toHaveTitle("visitor page");
    await expect(page.getByText("lorem ipsum")).toHaveCount(1);
    await expect(
      page.locator("nav", { hasText: "visitor layout" })
    ).toHaveCount(1);
  });

  test("it passthru proxies pages with unknown layouts", async ({ page }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "visitor page",
      layout: "jaiosdfjo",
      content: "lorem ipsum",
    });
    await customProxy.goto({ waitFor: 0 });
    await expect(page).toHaveTitle("visitor page");
    await expect(page.getByText("lorem ipsum")).toHaveCount(1);
    // layout is not inserted
    await expect(
      page.locator("nav", { hasText: "visitor layout" })
    ).toHaveCount(0);
  });

  test("it serves vite pages", async ({ page }) => {
    await page.goto("./vite-page");

    await expect(page).toHaveTitle("vite page");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "vite page"
    );
    await expect(page.getByText("Vite is here")).toHaveCount(1);
  });

  test("it serves nested vite pages", async ({ page }) => {
    await page.goto("./vite-page/nested");

    await expect(page).toHaveTitle("nested vite page");
    await expect(page.getByText("Vite is here")).toHaveCount(1);
  });

  test("it serves vite pages on root path", async ({ page }) => {
    await page.goto("./");

    await expect(page).toHaveTitle("root page");
    await expect(page.getByText("Vite is here")).toHaveCount(1);
  });

  test("it handles react inserting body scripts", async ({ page }) => {
    const logs = storeConsoleLog(page);
    await page.goto("./react-body-script-injection");

    await expect.poll(() => logs).toContain("hello");

    await page.getByText("legacy page").click();
    logs.length = 0;

    await page.getByText("React Body").click();
    await expect.poll(() => logs).toContain("hello");

    await page.getByText("legacy page").click();
    await expect(page.getByText("React Body")).toHaveCount(1);
  });

  test("it loads the head", async ({ page }) => {
    await page.goto("./head-test");

    await expect(page).toHaveTitle("head test");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "a cool description"
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://nextjs.org"
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "black"
    );
  });

  test("proxy page runs onClientInit once", async ({ page }) => {
    const logs = storeConsoleLog(page);
    const customProxy = new CustomProxyPage(page, {
      title: "visitor page",
      layout: "visitor",
      content: "lorem ipsum",
      links: [{ title: "second page", content: "second page body content" }],
    });
    await customProxy.goto();
    expect(logs).toContain("onClientInit");
    logs.length = 0;
    await customProxy.clickLink("second page");
    expect(logs).not.toContain("onClientInit in proxyPage");
  });

  test("vite page runs onClientInit once", async ({ page }) => {
    const logs = storeConsoleLog(page);
    await page.goto("./vite-page", {
      waitUntil: "networkidle",
    });
    expect(logs).toContain("onClientInit");
    logs.length = 0;
    await page.getByText("head test").click();
    expect(logs).not.toContain("onClientInit in proxyPage");
  });
});

test.describe("trailing slashes on custom routes", () => {
  test("redirects to no slash", async ({ page }) => {
    await page.goto("./this-is-a-custom-route/");

    await expect(page).toHaveTitle("custom route");
    await expect(page).toHaveURL("/this-is-a-custom-route");
  });

  test("redirects with query parameter", async ({ page }) => {
    await page.goto("./this-is-a-custom-route/?abc=1");

    await expect(page).toHaveTitle("custom route");
    await expect(page).toHaveURL("/this-is-a-custom-route?abc=1");
  });

  test("redirects with hash", async ({ page }) => {
    await page.goto("./this-is-a-custom-route/#abc");

    await expect(page).toHaveTitle("custom route");
    await expect(page).toHaveURL("/this-is-a-custom-route#abc");
  });
});

test("it keeps the favicon between pages", async ({ page }) => {
  await page.goto("./vite-page");
  await sleep(500);
  await ensureNoBrowserNavigation(page, () =>
    page.getByText("head test").click()
  );
  await sleep(500);
  await expect(page.locator("link[rel='icon']")).toHaveCount(1);
});

test("body attributes are copied over", async ({ page }) => {
  const customProxy = new CustomProxyPage(page, {
    title: "page",
    bodyAttrs: `id="mainstuff" class="cool-div" data-thing="true"`,
    links: [
      {
        title: "next",
        bodyAttrs: `id="other" data-other="false"`,
      },
    ],
  });
  await customProxy.goto();
  const body = page.locator("body").last();
  expect(await body.getAttribute("id")).toEqual("mainstuff");
  expect(await body.getAttribute("class")).toEqual("cool-div");
  expect(await body.getAttribute("data-thing")).toEqual("true");

  // modifies attr correctly on client nav too.
  await customProxy.clickLink("next");
  expect(await body.getAttribute("id")).toEqual("other");
  expect(await body.getAttribute("class")).toBeNull();
  expect(await body.getAttribute("data-thing")).toBeNull();
  expect(await body.getAttribute("data-other")).toEqual("false");
});

test("uses config body attributes", async ({ page }) => {
  await page.goto("./body-test");
  await waitForTurbolinksInit(page);
  const body = page.locator("body").last();
  expect(await body.getAttribute("id")).toEqual("body-test-id");
  expect(await body.getAttribute("class")).toEqual("body-test-classname");

  await page.getByText("Vite Page Link").click();
  const body2 = page.locator("body").last();
  await expect(page).toHaveTitle("vite page");
  expect(await body2.getAttribute("id")).toEqual("test-id");
  expect(await body2.getAttribute("class")).toEqual("test-classname");
});

test.describe("script configs", () => {
  test("renders cumulative scripts", async ({ page }) => {
    const logs = storeConsoleLog(page);
    await page.goto("./vite-page/nested");

    // inserted by vite-page's config
    expect(logs).toContain("hello from vite-page");
    // inserted by nested's config
    expect(logs).toContain("hello from vite-page/nested");
  });

  test("uses page context conditionally", async ({ page }) => {
    let logs = storeConsoleLog(page);
    await page.goto("./head-test?loggedIn=1");
    expect(logs).toContain("logged in");

    logs = storeConsoleLog(page);
    await page.goto("./head-test");
    expect(logs).not.toContain("logged in");
  });
});

// If passToClient is misconfigured we will end up sending proxy content in HTML and the JSON hydration blob, doubling page size.
// Being able to configure this is why we chose VPS over next.js or remix which always serialize all props
test("on SSR of proxied page, proxy content is only sent once", async ({
  page,
}) => {
  const content =
    "We'll take a little bit of Van Dyke Brown. You can just push a little tree out of your brush like that.";
  const customProxy = new CustomProxyPage(page, {
    title: "page",
    content,
  });
  await customProxy.goto();
  // bob ross ipsum only shows in html once.
  expect((await page.content()).split(content).length - 1).toEqual(1);
});

test.describe("client navigation", () => {
  // ensures on proxied pageContext requests we rewrite Accept from json to html.
  test("to proxied route that also serves json", async ({ page, baseURL }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "a",
      content: "<a href='/json-route'>json route</a>",
    });
    await customProxy.goto();
    await page.getByText("json route").click();
    await expect(page).toHaveTitle("json route");
    await expect(page.locator("body")).toContainText("hi");
  });

  test("to proxied page with no layout", async ({ page, baseURL }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "a",
      links: [
        {
          layout: "",
          title: "b",
        },
      ],
    });
    await customProxy.goto();
    await customProxy.clickLink("b");
  });

  test("to proxied page with unknown layout", async ({ page, baseURL }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "a",
      links: [
        {
          layout: "jaisodf",
          title: "b",
        },
      ],
    });
    await customProxy.goto();
    await customProxy.clickLink("b");
  });

  test("navigate() works and does not reload", async ({ page }) => {
    await page.goto("./vite-page", {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveTitle("vite page");
    await ensureNoBrowserNavigation(page, async () => {
      await page.getByText("head test").click();
      await expect(page).toHaveTitle("head test");
    });
  });
});

test.describe("redirects", () => {
  test("on initial load, follows redirect", async ({ page, baseURL }) => {
    const customProxy = new CustomProxyPage(page, {
      redirectTo: { title: "redirect destination" },
    });
    await customProxy.goto();
    // verify we're still on main domain and didn't follow redirect to proxied server's domain
    expect(page.url()).toContain(`${baseURL}/custom`);
  });

  test("on client navigation, follows redirect", async ({ page, baseURL }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      links: [{ redirectTo: { title: "redirect destination" } }],
    });
    await customProxy.goto();
    await customProxy.clickLink("redirect destination");
    expect(page.url()).toContain(`${baseURL}/custom`);
  });

  test("sets cookies along the way", async ({ page, context, baseURL }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      links: [
        {
          cookies: { cookie1: "value1" },
          redirectTo: { title: "redirect destination" },
        },
      ],
    });
    await customProxy.goto();
    await customProxy.clickLink("redirect destination");
    expect(await context.cookies()).toMatchObject([
      { name: "cookie1", value: "value1" },
    ]);
    expect(page.url()).toContain(`${baseURL}/custom`);
  });
});

test.describe("turbolinks: events", () => {
  test("on SSR load of proxy page, it just fires turbolinks:load", async ({
    page,
  }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
    });
    await customProxy.goto();
    expect(customProxy.turbolinksLog).toEqual(["turbolinks:load"]);
  });

  test("navigating proxy page => proxy page, it fires everything", async ({
    page,
  }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      content: "first page body content",
      links: [{ title: "second page", content: "second page body content" }],
    });
    await customProxy.goto();

    const head1 = (m: StringMatcher) => m.toEqual("first page");
    const head2 = (m: StringMatcher) => m.toEqual("second page");
    const body1 = (m: StringMatcher) => m.toContain("first page body content");
    const body2 = (m: StringMatcher) => m.toContain("second page body content");

    // assert we get to the second page at the exact right time
    const waitForTurbolinks = validateDOMOnTurbolinks(
      page,
      ["title", "body"], // grab textcontent of these selectors to assert against
      [
        [T.click, head1, body1],
        [T.beforeVisit, head1, body1],
        [T.visit, head1, body1],
        [T.beforeCache, head1, body1],
        [T.beforeRender, head2, body1],
        [T.render, head2, body2],
        [T.load, head2, body2],
      ]
    );
    await customProxy.clickLink("second page");
    await waitForTurbolinks;
    expect(customProxy.turbolinksLog).toEqual([
      T.click,
      T.beforeVisit,
      T.visit,
      T.beforeCache,
      T.beforeRender,
      T.render,
      T.load,
    ]);
    await expectNoMoreScripts(page);
  });

  test("runs blocking head scripts and inline body scripts before turbolinks:render", async ({
    // critical for scripts that expect to be able to register event listener
    page,
  }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      content: "first page body content",
      links: [
        {
          title: "second page",
          content: "second page body content",
          headScripts: ["blocking", "inline1"],
          bodyScripts: ["blocking", "inline1"],
        },
      ],
    });
    await customProxy.goto();
    await customProxy.clickLink("second page", { waitFor: 500 });
    expect(customProxy.scriptAndTurbolinksLog).toEqual([
      T.click,
      T.beforeVisit,
      T.visit,
      T.beforeCache,
      "head script: inline 1",
      T.beforeRender,
      "head script: blocking",
      "body script: inline 1",
      T.render,
      T.load,
      "body script: blocking",
    ]);
    await expectNoMoreScripts(page);
  });

  test("loading vite page fires turbolinks:load", async ({ page }) => {
    const logs = storeConsoleLog(page);
    await page.goto("./vite-page");

    expect(logs).toContain("turbolinks:load");
  });

  test("navigating proxy => vite page fires all events", async ({ page }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      content: "first page body content",
    });
    await customProxy.goto();

    const head1 = (m: StringMatcher) => m.toEqual("first page");
    const head2 = (m: StringMatcher) => m.toEqual("vite page");
    const body1 = (m: StringMatcher) => m.toContain("first page body content");
    const body2 = (m: StringMatcher) => m.toContain("vite is here");

    // assert we arent on the second page until load fires
    const waitForTurbolinks = validateDOMOnTurbolinks(
      page,
      ["title", "body"],
      [
        [T.click, head1, body1],
        [T.beforeVisit, head1, body1],
        [T.visit, head1, body1],
        [T.beforeCache, head1, body1],
        [T.beforeRender, head2, body1],
        [T.render, head2, body2],
        [T.load, head2, body2],
      ]
    );
    await customProxy.clickLink("vite page");
    await waitForTurbolinks;
    expect(customProxy.turbolinksLog).toEqual([
      T.click,
      T.beforeVisit,
      T.visit,
      T.beforeCache,
      T.beforeRender,
      T.render,
      T.load,
    ]);
  });

  // We do not want to cache new pages
  test("leaving vite page to proxy page fires all events EXCEPT cache", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);

    await page.goto("./vite-page", {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveTitle("vite page");

    const head1 = (m: StringMatcher) => m.toEqual("vite page");
    const head2 = (m: StringMatcher) => m.toEqual("legacy page");
    const body1 = (m: StringMatcher) => m.toContain("vite is here");
    const body2 = (m: StringMatcher) => m.toContain("legacy body");

    // assert we arent on the second page until load fires
    const waitForTurbolinks = validateDOMOnTurbolinks(
      page,
      ["title", "body"],
      [
        [T.click, head1, body1],
        [T.beforeVisit, head1, body1],
        [T.visit, head1, body1],
        [T.beforeRender, head2, body1],
        [T.render, head2, body2],
        [T.load, head2, body2],
      ]
    );
    const logs = storeConsoleLog(page);

    await ensureNoBrowserNavigation(page, () =>
      page.getByText("legacy page").click()
    );
    await expect(page).toHaveTitle("legacy page");
    await waitForTurbolinks;
    expect(logs.filter((s) => s.startsWith("turbolinks:"))).toEqual([
      T.click,
      T.beforeVisit,
      T.visit,
      T.beforeRender,
      T.render,
      T.load,
    ]);
  });
});

test("on client side navigation, it autofocuses correctly", async ({
  page,
}) => {
  const customProxy = new CustomProxyPage(page, {
    title: "first page",
    content: `<button autofocus>a</button>`,
    links: [
      {
        title: "second page",
        content: `<input autofocus/>`,
      },
    ],
  });
  await customProxy.goto();
  await expect(page.getByRole("button")).toBeFocused();

  await customProxy.clickLink("second page");
  await expect(page.getByRole("textbox")).toBeFocused();
});

test.describe("back button restoration", () => {
  test("back button does not cause network request", async ({
    page,
    context,
  }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      content: "first page body content",
      links: [{ title: "second page", content: "second page body content" }],
    });
    await customProxy.goto();
    await customProxy.clickLink("second page");
    await context.route(/index.pageContext.json/, () => {
      throw new Error("Back button should not make network request");
    });
    await customProxy.goBack();
    await customProxy.goForward();
  });

  test("restores layout", async ({ page, context }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      layout: "main_nav",
      links: [{ title: "second page", layout: "visitor" }],
    });
    await customProxy.goto();
    const nav = page.locator("nav");
    await expect(nav).toContainText("Main Nav Layout");
    await customProxy.clickLink("second page");
    await expect(nav).toContainText("visitor layout");
    await customProxy.goBack();
    await expect(nav).toContainText("Main Nav Layout");
    await customProxy.goForward();
    await expect(nav).toContainText("visitor layout");
  });

  test("saves changes made to dom, including before:cache", async ({
    page,
  }) => {
    const customProxy = new CustomProxyPage(page, {
      title: "first page",
      content: "first page body content",
      links: [{ title: "second page", content: "second page body content" }],
    });
    await customProxy.goto();
    const edit = page.getByRole("link").first();

    await page.evaluate((rRoot: any) => {
      rRoot.appendChild(document.createTextNode("edit1"));
      document.addEventListener("turbolinks:before-cache", () => {
        rRoot.appendChild(document.createTextNode("edit2"));
      });
    }, await edit.elementHandle());
    await expect(edit).toContainText("edit1");
    await expect(edit).not.toContainText("edit2");

    await customProxy.clickLink("second page");
    await expect(edit).not.toContainText("edit1");
    await expect(edit).not.toContainText("edit2");

    // edits restored, including from before-cache
    await customProxy.goBack();
    await expect(edit).toContainText("edit1");
    await expect(edit).toContainText("edit2");
  });

  test("does not restore vite pages", async ({ page }) => {
    await page.goto("./vite-page");
    await waitForTurbolinksInit(page);
    const edit = page.getByRole("link").first();
    await page.evaluate((rRoot: any) => {
      rRoot.appendChild(document.createTextNode("edit1"));
      document.addEventListener("turbolinks:before-cache", () => {
        rRoot.appendChild(document.createTextNode("edit2"));
      });
    }, await edit.elementHandle());

    await expect(edit).toContainText("edit1");
    await expect(edit).not.toContainText("edit2");

    await page.getByText("legacy page").click();

    // edits not restored - vite pages should store server state in react-query, and critical client state directly in history
    await expect(edit).not.toContainText("edit1");
    await expect(edit).not.toContainText("edit2");
  });
});

test("links with data-turbolinks=false cause full page reload", async ({
  page,
}) => {
  ensureAllNetworkSucceeds(page);

  const customProxy = new CustomProxyPage(page, {
    title: "page",
    headScripts: ["blocking"],
    links: [
      {
        title: "turbolinks false",
        headScripts: ["blocking"],
        turbolinks: false,
      },
    ],
  });

  await customProxy.goto();

  await customProxy.clickLink("turbolinks false", { browserReload: true });
});

test.describe("script loading order", () => {
  test("on SSR of proxied page, it runs blocking head scripts, blocking body scripts, then deferred", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "Page with Scripts",
      headScripts: ["inline1", "blocking", "defer"],
      bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
    });

    await customProxy.goto();

    expect(customProxy.scriptLog).toEqual([
      "head script: inline 1",
      "head script: blocking",
      "body script: blocking",
      "body script: inline 1",
      "body script: inline 2",
      "body script: blocking",
      "head script: deferred",
    ]);

    await expectNoMoreScripts(page);
  });

  // client nav script order doesnt support defer at the moment.
  test("on client navigation of proxied page, it runs head scripts then body scripts", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "scriptless",
      links: [
        {
          title: "with scripts",
          headScripts: ["inline1", "blocking", "defer"],
          bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
        },
      ],
    });
    await customProxy.goto();

    expect(customProxy.scriptLog).toEqual([]);

    await customProxy.clickLink("with scripts", { waitFor: 500 });

    expect(customProxy.scriptLog).toEqual([
      "head script: inline 1",
      "head script: blocking",
      "body script: inline 1", // order of inlines is respected
      "body script: inline 2",
      "head script: deferred", // deferred runs earlier which is different
      "body script: blocking", // remote scripts load after inline due to network req. could be stricter about script order
      "body script: blocking",
    ]);

    await expectNoMoreScripts(page);
  });

  test("script => noscripts => script doesn't rerun head scripts", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "with scripts 1",
      headScripts: ["inline1", "blocking", "defer"],
      bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
      links: [
        {
          title: "scriptless",
          links: [
            {
              title: "with scripts 2",
              headScripts: ["inline1", "blocking", "defer"],
              bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
            },
          ],
        },
      ],
    });

    await customProxy.goto();

    expect(customProxy.scriptLog).toEqual([
      "head script: inline 1",
      "head script: blocking",
      "body script: blocking",
      "body script: inline 1",
      "body script: inline 2",
      "body script: blocking",
      "head script: deferred",
    ]);

    await customProxy.clickLink("scriptless");
    expect(customProxy.scriptLog).toEqual([]);

    // come back to scripts page
    await customProxy.clickLink("with scripts 2", { waitFor: 500 });

    // runs body scripts but no hea scripts
    expect(customProxy.scriptLog).toEqual([
      "body script: inline 1",
      "body script: inline 2",
      "body script: blocking",
      "body script: blocking",
    ]);

    await expectNoMoreScripts(page);
  });

  test("loading more scripts runs all body scripts but only new head scripts", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "subset",
      headScripts: ["inline1", "defer"],
      bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
      links: [
        {
          title: "all scripts",
          headScripts: ["inline1", "blocking", "defer"],
          bodyScripts: ["blocking", "inline1", "inline2", "blocking"],
        },
      ],
    });

    await customProxy.goto();

    expect(customProxy.scriptLog).toEqual([
      "head script: inline 1",
      "body script: blocking",
      "body script: inline 1",
      "body script: inline 2",
      "body script: blocking",
      "head script: deferred",
    ]);

    await customProxy.clickLink("all scripts", { waitFor: 500 });

    // runs all body scripts but not existing head
    expect(customProxy.scriptLog).toEqual([
      "head script: blocking",
      "body script: inline 1",
      "body script: inline 2",
      "body script: blocking",
      "body script: blocking",
    ]);

    await expectNoMoreScripts(page);
  });

  test.describe("data-turbolinks-track", () => {
    test("losing tracked scripts triggers full reload", async ({ page }) => {
      ensureAllNetworkSucceeds(page);

      const customProxy = new CustomProxyPage(page, {
        title: "tracked",
        headScripts: ["inline1", "trackedA", "defer"],
        links: [
          {
            title: "no tracked",
            headScripts: ["inline1", "defer"],
          },
        ],
      });

      await customProxy.goto();

      await customProxy.clickLink("no tracked", { browserReload: true });
    });

    test("adding tracked scripts triggers full reload", async ({ page }) => {
      ensureAllNetworkSucceeds(page);

      const customProxy = new CustomProxyPage(page, {
        title: "no tracked",
        headScripts: ["inline1", "defer"],
        links: [
          {
            title: "tracked",
            headScripts: ["inline1", "trackedA", "defer"],
          },
        ],
      });

      await customProxy.goto();

      await customProxy.clickLink("tracked", { browserReload: true });
    });

    test("changing tracked scripts triggers full reload", async ({ page }) => {
      ensureAllNetworkSucceeds(page);

      const customProxy = new CustomProxyPage(page, {
        title: "tracked",
        headScripts: ["inline1", "trackedB", "defer"],
        links: [
          {
            title: "trackedA",
            headScripts: ["inline1", "trackedA", "defer"],
          },
        ],
      });

      await customProxy.goto();

      await customProxy.clickLink("trackedA", { browserReload: true });
    });

    test("moving from tracked page to unproxied page", async ({ page }) => {
      ensureAllNetworkSucceeds(page);

      const customProxy = new CustomProxyPage(page, {
        title: "tracked",
        headScripts: ["inline1", "trackedB", "defer"],
      });

      await customProxy.goto();

      await customProxy.clickLink("vite page", { browserReload: false });
    });
  });

  test("moving from new to legacy loads scripts in correct order", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);
    const logs = storeConsoleLog(page);

    await page.goto("./vite-page", {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveTitle("vite page");
    expect(logs.filter((s) => s.includes("script"))).toEqual([]);
    await sleep(50);

    await ensureNoBrowserNavigation(page, () =>
      page.getByText("legacy page").click()
    );
    await expect(page).toHaveTitle("legacy page");

    // regular client-side load order
    expect(logs.filter((s) => s.includes("script"))).toEqual([
      "head script: inline 1",
      "head script: blocking",
      "body script: inline 1",
      "body script: inline 2",
      "head script: deferred",
      "body script: blocking",
      "body script: blocking",
    ]);
  });
});

async function expectLegacyPage(page: Page) {
  await expect(page.locator("nav")).toContainText("legacy navbar");
}

async function expectBifrostPage(page: Page) {
  await expect(page.locator("nav")).toContainText("Main Nav");
}

test.describe("with partial proxy", () => {
  test("navgating from proxied page to unproxied page does full reload", async ({
    page,
  }) => {
    ensureAllNetworkSucceeds(page);

    const customProxy = new CustomProxyPage(page, {
      title: "a",
      links: [{ title: "b", endpoint: "custom-direct" }],
    });
    await customProxy.goto();
    await expectBifrostPage(page);

    await customProxy.clickLink("b", { browserReload: true });
    await expectLegacyPage(page);
  });
});

test.describe("with ALB", () => {
  test("hitting backend directly returns legacy nav", async ({ page }) => {
    ensureAllNetworkSucceeds(page);

    const customDirect = new CustomProxyPage(page, {
      title: "legacy",
      endpoint: "custom-direct",
    });
    await customDirect.goto();
    await expectLegacyPage(page);

    const customProxy = new CustomProxyPage(page, {
      title: "legacy",
    });
    await customProxy.goto();
    await expectBifrostPage(page);
  });

  test.describe("misconfigured ALB (passthru proxy)", () => {
    // test that we gracefully recover from routes pointing to wrong place. important during deploys
    // ALB routes "/custom-incorrect" to bifrost but bifrost cannot handle it

    test.describe("pointing to Bifrost for route it can't handle", () => {
      test("SSR proxies verbatim", async ({ page }) => {
        ensureAllNetworkSucceeds(page);

        const customProxy = new CustomProxyPage(page, {
          title: "incorrect",
          // see proxy/pages/wrapped/+route.ts - we only want to proxy /custom, not /custom-incorrect
          // yet, in alb, we configured custom-incorrect to go to bifrost
          endpoint: "custom-incorrect",
        });
        await customProxy.goto();
        await expectLegacyPage(page);
      });

      test("Navigating causes full reload", async ({ page }) => {
        ensureAllNetworkSucceeds(page);

        const customProxy = new CustomProxyPage(page, {
          title: "a",
          links: [{ title: "b", endpoint: "custom-incorrect" }],
        });
        await customProxy.goto();
        await expectBifrostPage(page);

        await customProxy.clickLink("b", { browserReload: true });
        await expectLegacyPage(page);
      });

      test("back button from vite page to passthru page causes full reload", async ({
        page,
      }) => {
        ensureAllNetworkSucceeds(page);

        const customProxy = new CustomProxyPage(page, {
          title: "a",
          endpoint: "custom-incorrect",
          links: [{ title: "b" }],
        });
        await customProxy.goto();
        await expectLegacyPage(page);

        await customProxy.clickLink("b", {
          // Need to wait for bifrost vite to load - turbolinks:load fires earlier than that because it comes from legacy turbolinks.js loaded by old page
          waitFor: 500,
        });
        await expectBifrostPage(page);

        // going back to passthru page does full reload because passthru page has to be loaded through server
        await ensureBrowserNavigation(page, async () => {
          await customProxy.goBack();
          await sleep(50);
          await page.waitForLoadState("networkidle");
          await expectLegacyPage(page);
        });
      });

      test("back button from passthru page to vite page causes full reload", async ({
        page,
      }) => {
        ensureAllNetworkSucceeds(page);

        const customProxy = new CustomProxyPage(page, {
          title: "a",
          links: [
            {
              title: "b",
              endpoint: "custom-incorrect",
            },
          ],
        });
        await customProxy.goto();
        await expectBifrostPage(page);

        // Navigate to passthru page, reload
        await customProxy.clickLink("b", { browserReload: true });
        await expectLegacyPage(page);

        // going back to vite page does full reload because passthru page has to be loaded through server
        await ensureBrowserNavigation(page, async () => {
          await customProxy.goBack();
          await sleep(50);
          await page.waitForLoadState("networkidle");
          await expectBifrostPage(page);
        });
      });
    });

    test.describe("pointing to legacy backend for route Bifrost expects to handle", () => {
      // SSR is obviously fine - backend will just do what it does

      test("client side proxy works", async ({ page }) => {
        const customProxy = new CustomProxyPage(page, {
          title: "a",
          links: [{ title: "b", endpoint: "custom-bifrost" }],
        });

        await customProxy.goto();
        await expectBifrostPage(page);

        await customProxy.clickLink("b", { browserReload: false });
        await expectBifrostPage(page);
      });
    });
  });
});

test.describe("useNavigation", () => {
  test("renders navigation state", async ({ page }) => {
    await page.goto("./navigation-test", {
      waitUntil: "networkidle",
    });
    await expect(page.locator("#nav-state")).toContainText("idle");
    page.getByText("slow page").click();
    await expect(page.locator("#nav-state")).toContainText("loading");
  });

  test("navigate() resolves after page load", async ({ page }) => {
    await page.goto("./navigation-test", {
      waitUntil: "networkidle",
    });

    await page.getByText("navigate()").click();
    expect(await page.title()).not.toEqual("slow page");

    // wait for navigate() promise resolve
    await new Promise(function (resolve) {
      page.on(
        "console",
        (msg) => msg.text() == "navigation promise resolved" && resolve(msg)
      );
    });
    expect(await page.title()).toEqual("slow page");
  });
});
