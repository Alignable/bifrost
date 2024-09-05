import { expect, Page } from "@playwright/test";
import {
  followRedirects,
  PageData,
  PageDataOk,
  toPath,
  Turbolinks,
} from "../../fake-backend/page-builder";
import {
  ensureBrowserNavigation,
  ensureNoBrowserNavigation,
  sleep,
  storeConsoleLog,
  waitForConsoleLog,
  waitForTurbolinksInit,
} from "./test-helpers";

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

  async goto({
    waitFor = "turbolinks",
  }: { waitFor?: "turbolinks" | number } = {}) {
    this.consoleLog = storeConsoleLog(this.page);
    await this.page.goto(toPath(this.initialPageData), {
      waitUntil: "networkidle",
    });
    if (waitFor === "turbolinks") {
      await waitForTurbolinksInit(this.page);
    } else {
      await sleep(waitFor);
    }
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

  async clickLink(
    title: string,
    {
      browserReload = false,
      waitFor = "turbolinks",
    }: { browserReload?: boolean; waitFor?: "turbolinks" | number } = {}
  ) {
    this.consoleLog = storeConsoleLog(this.page);

    await (browserReload ? ensureBrowserNavigation : ensureNoBrowserNavigation)(
      this.page,
      async () => {
        await this.page.getByRole("link").filter({ hasText: title }).click();

        if (waitFor == "turbolinks") {
          await waitForConsoleLog(
            this.page,
            (msg) => msg.text() === "turbolinks:load"
          );
        } else {
          await sleep(waitFor); // TODO: wait on something smarter.
        }

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
