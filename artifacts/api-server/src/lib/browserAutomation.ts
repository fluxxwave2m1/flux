import { existsSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";
import {
  FLOWMIND_BROWSER_DEMO_PAGE_PATH,
  FLOWMIND_BROWSER_DEMO_RESULT_PATH,
} from "./browserDemoPage";

const MAX_TEXT_LENGTH = 4_000;
const MAX_SELECTOR_LENGTH = 240;
const MAX_INPUT_LENGTH = 1_000;
const DEMO_PATHS = new Set([
  FLOWMIND_BROWSER_DEMO_PAGE_PATH,
  FLOWMIND_BROWSER_DEMO_RESULT_PATH,
]);

export type BrowserToolResult = {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  value?: unknown;
  detail: string;
};

function boundedText(value: unknown, limit = MAX_INPUT_LENGTH): string {
  return String(value ?? "").slice(0, limit);
}

function browserErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Browser action failed.";
}

export class FlowMindBrowserSession {
  constructor(
    private readonly browser: Browser,
    private readonly page: Page,
    private readonly localOrigin: string,
  ) {}

  private currentPage(): Page {
    if (!this.page.url()) {
      throw new Error("Open the local FlowMind browser demo before using other browser actions.");
    }
    return this.page;
  }

  private selector(config: Record<string, unknown>): string {
    const selector = boundedText(config.selector, MAX_SELECTOR_LENGTH).trim();
    if (!selector) throw new Error("A CSS selector is required for this browser action.");
    if (/^(?:xpath|text|javascript)\s*=|^javascript:/i.test(selector)) {
      throw new Error("Only CSS selectors are supported in the local browser demo.");
    }
    return selector;
  }

  private async uniqueLocator(page: Page, selector: string) {
    const locator = page.locator(selector);
    const count = await locator.count();
    if (count !== 1) {
      throw new Error(count === 0
        ? `No element matched selector "${selector}".`
        : `Selector "${selector}" matched more than one element.`);
    }
    return locator;
  }

  async run(actionType: string, config: Record<string, unknown>): Promise<BrowserToolResult> {
    switch (actionType) {
      case "browser_open_url": {
        const rawUrl = boundedText(config.url || FLOWMIND_BROWSER_DEMO_PAGE_PATH, 500);
        let target: URL;
        try {
          target = new URL(rawUrl, this.localOrigin);
        } catch {
          throw new Error("Enter the local FlowMind browser demo URL.");
        }
        if (
          target.origin !== this.localOrigin
          || target.pathname !== FLOWMIND_BROWSER_DEMO_PAGE_PATH
          || target.search
          || target.hash
        ) {
          throw new Error("Browser automation is restricted to the local FlowMind demo page.");
        }
        const response = await this.page.goto(target.href, {
          waitUntil: "domcontentloaded",
          timeout: 10_000,
        });
        if (!response?.ok()) throw new Error("The local browser demo page could not be opened.");
        const title = await this.page.title();
        return {
          input: { url: FLOWMIND_BROWSER_DEMO_PAGE_PATH },
          output: { title, url: FLOWMIND_BROWSER_DEMO_PAGE_PATH },
          value: FLOWMIND_BROWSER_DEMO_PAGE_PATH,
          detail: `Opened the local demo page in an isolated browser (${title}).`,
        };
      }
      case "browser_read_page": {
        const page = this.currentPage();
        const text = (await page.locator("body").innerText()).slice(0, MAX_TEXT_LENGTH);
        return {
          input: { url: page.url() },
          output: { text },
          value: text,
          detail: `Read ${text.length} characters of visible text from the local demo page.`,
        };
      }
      case "browser_extract_text": {
        const page = this.currentPage();
        const selector = this.selector(config);
        const locator = await this.uniqueLocator(page, selector);
        const text = (await locator.innerText({ timeout: 3_000 })).slice(0, MAX_TEXT_LENGTH);
        return {
          input: { selector },
          output: { text },
          value: text,
          detail: `Extracted ${text.length} characters from ${selector}.`,
        };
      }
      case "browser_find_element": {
        const page = this.currentPage();
        const selector = this.selector(config);
        const locator = page.locator(selector);
        const count = await locator.count();
        const text = count ? (await locator.first().innerText().catch(() => "")).slice(0, 500) : "";
        const exists = count > 0;
        return {
          input: { selector },
          output: { exists, count, text },
          value: exists,
          detail: exists
            ? `Found ${count} element${count === 1 ? "" : "s"} matching ${selector}.`
            : `No element matched ${selector}.`,
        };
      }
      case "browser_click": {
        const page = this.currentPage();
        const selector = this.selector(config);
        const locator = await this.uniqueLocator(page, selector);
        await locator.click({ timeout: 3_000 });
        return {
          input: { selector },
          output: { clicked: true },
          value: true,
          detail: `Clicked ${selector} on the local demo page.`,
        };
      }
      case "browser_type": {
        const page = this.currentPage();
        const selector = this.selector(config);
        const value = boundedText(config.value);
        const locator = await this.uniqueLocator(page, selector);
        await locator.fill(value, { timeout: 3_000 });
        return {
          input: { selector, value },
          output: { filled: true, characterCount: value.length },
          value,
          detail: `Entered ${value.length} characters into ${selector}.`,
        };
      }
      case "browser_select": {
        const page = this.currentPage();
        const selector = this.selector(config);
        const value = boundedText(config.value, 120);
        const locator = await this.uniqueLocator(page, selector);
        await locator.selectOption(value, { timeout: 3_000 });
        return {
          input: { selector, value },
          output: { selected: value },
          value,
          detail: `Selected "${value}" in ${selector}.`,
        };
      }
      case "browser_wait": {
        const page = this.currentPage();
        const milliseconds = Number(config.milliseconds ?? 250);
        if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 5_000) {
          throw new Error("Wait time must be between 0 and 5,000 milliseconds.");
        }
        await page.waitForTimeout(milliseconds);
        return {
          input: { milliseconds },
          output: { waited: true },
          value: true,
          detail: `Waited ${milliseconds} ms in the local browser.`,
        };
      }
      case "browser_read_result": {
        const page = this.currentPage();
        const selector = boundedText(config.selector || "#demo-result", MAX_SELECTOR_LENGTH).trim();
        const locator = await this.uniqueLocator(page, selector);
        const text = (await locator.innerText({ timeout: 3_000 })).slice(0, MAX_TEXT_LENGTH);
        return {
          input: { selector, url: page.url() },
          output: { text },
          value: text,
          detail: `Read the result from ${selector}.`,
        };
      }
      default:
        throw new Error(`Unsupported browser tool "${actionType}".`);
    }
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}

export async function createFlowMindBrowserSession(): Promise<FlowMindBrowserSession> {
  const executablePath = process.env.FLOWMIND_CHROMIUM_EXECUTABLE_PATH || "/repl/tools/bin/chromium";
  if (!existsSync(executablePath)) {
    throw new Error("The local Chromium browser is not available in this environment.");
  }
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("A valid API server port is required to start the local browser.");
  }
  const localOrigin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-extensions",
      "--no-first-run",
    ],
  });

  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.route("**/*", async (route) => {
      let requestUrl: URL;
      try {
        requestUrl = new URL(route.request().url());
      } catch {
        await route.abort();
        return;
      }
      const isAllowedLocalDemoRequest = requestUrl.origin === localOrigin
        && DEMO_PATHS.has(requestUrl.pathname)
        && route.request().method() === "GET";
      if (isAllowedLocalDemoRequest) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    return new FlowMindBrowserSession(browser, page, localOrigin);
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw new Error(browserErrorMessage(error));
  }
}
