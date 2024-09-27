browser.commands.onCommand.addListener(function (command) {
    if (command === 'execute-code') {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, { action: "openPopup" });
        }).catch(error => console.error('Error querying tabs:', error));
    }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentTabUrl") {
        sendResponse({ url: sender.tab.url });
    }

    if (message.action === "openTabs") {
        handleOpenTabs(message);
    }
});

function handleOpenTabs(message) {
    const { urls } = message;
    const createTabsInWindow = (windowId, urlObj) => {
        if (urlObj.newTab === '_blank') {
            browser.tabs.create({ url: urlObj.url, windowId, active: true });
        } else {
            browser.windows.update(windowId, { focused: true });
            browser.tabs.update({ url: urlObj.url, active: true });
        }
    };

    urls.forEach((urlObj) => {
        if (urlObj.incognito) {
            browser.windows.getAll({ windowTypes: ['normal'] }).then(windows => {
                const incognitoWindow = windows.find(window => window.incognito);
                if (incognitoWindow) {
                    createTabsInWindow(incognitoWindow.id, urlObj);
                    browser.windows.update(incognitoWindow.id, { focused: true });
                } else {
                    browser.windows.create({ url: urlObj.url, incognito: true });
                }
            });
        } else {
            browser.windows.getLastFocused().then(window => {
                createTabsInWindow(window.id, urlObj);
            });
        }
    });

}
