import {
  expect,
  Page,
  ConsoleMessage,
  ElementHandle,
  Expect,
} from "@playwright/test";

export function ensureAllNetworkSucceeds(page: Page) {
  page.on("response", (response) => {
    expect(
      response.status(),
      `network req should succeed ${response.url()}`
    ).toBeLessThan(400);
  });
}

export async function ensureNoBrowserNavigation(
  page: Page,
  cb: () => Promise<void>
) {
  await page.evaluate("window.__PLAYWRIGHT__ensure_no_nav = true");

  await cb();

  expect(
    await page.evaluate("window.__PLAYWRIGHT__ensure_no_nav"),
    `Browser reloaded!! Currently at: ${page.url()}`
  ).toBeTruthy();
}

export async function ensureBrowserNavigation(
  page: Page,
  cb: () => Promise<void>
) {
  await page.evaluate("window.__PLAYWRIGHT__ensure_no_nav = true");

  await cb();

  expect(
    await page.evaluate("window.__PLAYWRIGHT__ensure_no_nav"),
    `Browser did not reload!! Currently at: ${page.url()}`
  ).toBeFalsy();
}

// returns logs. logs will be mutated as console logs come in.
export function storeConsoleLog(page: Page): string[] {
  const logs: string[] = [];

  page.on("console", (msg) => logs.push(msg.text()));
  return logs;
}

export function waitForConsoleLog(
  page: Page,
  filter: (msg: ConsoleMessage) => boolean
): Promise<ConsoleMessage> {
  return new Promise(function (resolve) {
    page.on("console", (msg) => filter(msg) && resolve(msg));
  });
}

export function waitForScriptRun(page: Page): Promise<ConsoleMessage> {
  return waitForConsoleLog(page, (msg) => msg.text().includes("script"));
}

export async function waitForTurbolinksInit(page: Page) {
  return page.waitForFunction("window.Turbolinks?.controller?.started");
}

// Generally bad practice to hard wait in tests but we need to verify "no more console logs"
export function sleep(timeout: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout);
  });
}

// expect that no more script runs logged to console. waitFor (milliseconds) for next console log
export async function expectNoMoreScripts(page: Page, waitFor = 5) {
  const wait = await Promise.any([waitForScriptRun(page), sleep(waitFor)]);
  if (wait !== undefined) {
    expect(wait.text()).toBeFalsy();
  }
}

// Handles are passed down so that we can evaluate textContent syncronously in the browser.
//  if we get textContent in Playwright, we will not detect changes that happen within an animation frame.
export function onDocumentEvent(
  page: Page,
  eventName: string,
  selectorsToGetTextContent: string[]
): Promise<[Event, any]> {
  return page.evaluate(
    async ({ eventName, selectorsToGetTextContent }) =>
      new Promise((resolve) =>
        document.addEventListener(eventName, (ev) =>
          resolve([
            ev,
            selectorsToGetTextContent.map(
              (h) => document.querySelector(h)?.textContent || ""
            ),
          ])
        )
      ),
    { eventName, selectorsToGetTextContent }
  );
}

//typescript hack
const stringMatchFn = () => expect("");
export type StringMatcher = ReturnType<typeof stringMatchFn>;

// We should not use Playwright's awaited expectations.
// the point of these callbacks is to assert on the state of the DOM at the moment of the event.
// Playwright will just wait until the DOM changes to match the expectation
export async function validateDOMOnTurbolinks<T>(
  page: Page,
  selectors: string[],
  events: [
    eventName: string,
    ...expectations: ((
      matcher: StringMatcher
    ) => T extends Promise<unknown> ? never : T)[]
  ][]
) {
  return Promise.all(
    events.map(([eventName, ...callbacks]) =>
      onDocumentEvent(page, eventName, selectors).then(
        ([event, textContents]) =>
          callbacks.forEach((cb, i) =>
            cb(
              expect.soft(
                textContents[i],
                `${eventName} failed on ${selectors[i]}`
              )
            )
          )
      )
    )
  );
}
