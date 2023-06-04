import { expect, Page } from "@playwright/test";
import {
  followRedirects,
  PageData,
  PageDataOk,
  Turbolinks,
} from "../../fake-backend/page-builder";
import {
  ensureBrowserNavigation,
  ensureNoBrowserNavigation,
  sleep,
  storeConsoleLog,
} from "./test-helpers";

function customPageUrl(pageData: PageData) {
  return `./custom?page=${JSON.stringify(pageData)}`;
}

export class CustomProxyPage {
  readonly page: Page;
  pageData?: PageDataOk;
  private initialPageData: PageData;
  private back?: PageDataOk;
  private forward?: PageDataOk;
  consoleLog: string[];

  constructor(page: Page, pageData: PageData) {
    this.page = page;
    this.initialPageData = pageData;
    this.consoleLog = [];
  }

  async goto() {
    this.consoleLog = storeConsoleLog(this.page);
    await this.page.goto(customPageUrl(this.initialPageData), {
      waitUntil: "networkidle",
    });
    await sleep(1000)
    this.pageData = followRedirects(this.initialPageData);
    await expect(this.page).toHaveTitle(this.pageData.title);
  }

  async goBack() {
    await this.page.goBack();
    this.forward = this.pageData;
    this.pageData = this.back!;
    await expect(this.page).toHaveTitle(this.pageData.title);
  }

  async goForward() {
    await this.page.goForward();
    this.back = this.pageData;
    this.pageData = this.forward!;
    await expect(this.page).toHaveTitle(this.pageData.title);
  }

  get scriptLog() {
    return this.consoleLog.filter((l) => l.includes("script"));
  }

  get turbolinksLog() {
    return this.consoleLog.filter((l) =>
      l.startsWith("turbolinks:")
    ) as Turbolinks[];
  }

  get scriptAndTurbolinksLog() {
    return this.consoleLog.filter(
      (l) => l.includes("script") || l.startsWith("turbolinks:")
    );
  }

  async clickLink(title: string, { browserReload = false } = {}) {
    this.consoleLog = storeConsoleLog(this.page);

    await (browserReload ? ensureBrowserNavigation : ensureNoBrowserNavigation)(
      this.page,
      async () => {
        await this.page.getByRole("link").filter({ hasText: title }).click();
        await sleep(500); // TODO: wait on something smarter.

        if (title === "vite page") {
          this.pageData = undefined;
        } else {
          // traverse page data so it matches new page
          this.back = this.pageData;
          this.pageData = followRedirects(
            this.pageData!.links!.find(
              (l) => followRedirects(l).title === title
            )!
          );
        }
        await expect(this.page).toHaveTitle(title);
      }
    );
  }
}
