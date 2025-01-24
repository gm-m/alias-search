import browser from "webextension-polyfill";
import { UrlWithOptions } from "./services/types";
import { partitionArray } from "./utility";

type Message = {
    action: "openTabs" | "getCurrentTabUrl",
    urls: UrlWithOptions[];
};

browser.commands.onCommand.addListener(function (command) {
    if (command === 'execute-code') {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id!, { action: "openPopup" });
        }).catch(error => console.error('Error querying tabs:', error));
    }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentTabUrl") {
        //@ts-ignore
        sendResponse({ url: sender.tab.url });
    }

    if (message.action === "openTabs") {
        handleOpenTabs(message);
    }
});

async function createTabsInWindow(windowId: number, urlObjs: UrlWithOptions[]) {
    for (const urlObj of urlObjs) {
        if (urlObj.newTab) {
            await browser.tabs.create({ url: urlObj.url, windowId, active: true });
        } else {
            await browser.windows.update(windowId, { focused: true });
            await browser.tabs.update({ url: urlObj.url, active: true });
        }
    }
    await browser.windows.update(windowId, { focused: true });
}

async function findOrCreateIncognitoWindow(firstUrl: string): Promise<browser.Windows.Window> {
    const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
    const incognitoWindow = windows.find(window => window.incognito);

    if (incognitoWindow) {
        return incognitoWindow;
    }

    return browser.windows.create({ url: firstUrl, incognito: true });
}

async function findRegularWindow(): Promise<browser.Windows.Window> {
    // Try last focused window first
    const lastFocused = await browser.windows.getLastFocused();
    if (!lastFocused.incognito) {
        return lastFocused;
    }

    // Fall back to any regular window
    const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
    const regularWindow = windows.find(window => !window.incognito);

    if (regularWindow) {
        return regularWindow;
    }

    // Create new window if none exists
    return browser.windows.create({});
}

async function handleOpenTabs(message: Message) {
    const { urls } = message;

    if (!urls.length) {
        return;
    }

    try {
        // Split URLs into incognito and regular groups
        const [incognitoUrls, regularUrls] = partitionArray(urls, url => url.incognito);

        // Handle incognito URLs
        if (incognitoUrls.length > 0) {
            const incognitoWindow = await findOrCreateIncognitoWindow(incognitoUrls[0].url);
            await createTabsInWindow(incognitoWindow.id!, incognitoUrls);
        }

        // Handle regular URLs
        if (regularUrls.length > 0) {
            const regularWindow = await findRegularWindow();
            await createTabsInWindow(regularWindow.id!, regularUrls);
        }
    } catch (error) {
        console.error('Error handling tabs:', error);
    }
}
