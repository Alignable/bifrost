import { test, expect } from "@playwright/test";
import { CustomProxyPage } from "../helpers/custom-proxy-page";
import { toPath } from "../../fake-backend/page-builder";

// Legacy backend leaves placeholder divs; userspace renders <NestedComponentPortal>
// into the claimed ones and Bifrost strips the unclaimed ones from SSR output.
test.describe("nested component portals", () => {
  const claimed = `<div data-bifrost-render="myComponent">legacy fallback</div>`;
  const unclaimed = `<div data-bifrost-render="unclaimed">orphan markup</div>`;

  test("portals react content into the claimed placeholder", async ({
    page,
  }) => {
    const proxy = new CustomProxyPage(page, {
      title: "portal page",
      layout: "main_nav",
      content: claimed,
    });
    await proxy.goto();

    const placeholder = page.locator('[data-bifrost-render="myComponent"]');
    await expect(placeholder).toHaveCount(1);
    // client portal replaces the legacy fallback with react content
    await expect(placeholder).toContainText("portaled react content");
  });

  test("strips placeholders that no portal claimed (SSR)", async ({
    request,
  }) => {
    const path = toPath({
      title: "orphan page",
      layout: "main_nav",
      content: claimed + unclaimed,
    });
    const html = await (await request.get(path)).text();

    // claimed survives for the client to portal into; unclaimed is removed entirely
    expect(html).toContain('data-bifrost-render="myComponent"');
    expect(html).not.toContain('data-bifrost-render="unclaimed"');
    expect(html).not.toContain("orphan markup");
  });

  test("exposes requested component names to userspace", async ({ page }) => {
    const proxy = new CustomProxyPage(page, {
      title: "requested page",
      layout: "main_nav",
      content: `${claimed}${unclaimed}`,
    });
    await proxy.goto();
    // pageContext.proxyNestedComponents lists every requested template, even
    // ones with no matching portal, so userspace can gate data-fetching on it.
    await expect(page.getByTestId("requested-components")).toHaveText(
      "myComponent,unclaimed"
    );
  });

  test("portals after client-side navigation", async ({ page }) => {
    const proxy = new CustomProxyPage(page, {
      title: "start page",
      layout: "main_nav",
      content: "start content",
      links: [
        {
          title: "portal target",
          layout: "main_nav",
          content: claimed,
        },
      ],
    });
    await proxy.goto();
    await proxy.clickLink("portal target");

    const placeholder = page.locator('[data-bifrost-render="myComponent"]');
    await expect(placeholder).toHaveCount(1);
    await expect(placeholder).toContainText("portaled react content");
  });
});
