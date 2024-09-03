chrome.commands.onCommand.addListener(function (command) {
    if (command === 'execute-code') {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            chrome.tabs.executeScript(activeTab.id, { file: 'content.js' }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error injecting script:', chrome.runtime.lastError);
                } else {
                    chrome.tabs.executeScript(activeTab.id, {
                        code: 'openPopup();'
                    });
                }
            });
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            chrome.tabs.create({ url: urlObj.url, windowId, active: true });
        } else {
            chrome.windows.update(windowId, { focused: true });
            chrome.tabs.update({ url: urlObj.url, active: true });
        }
    };

    urls.forEach((urlObj) => {
        if (urlObj.incognito) {
            chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
                const incognitoWindow = windows.find((window) => window.incognito);
                if (incognitoWindow) {
                    createTabsInWindow(incognitoWindow.id, urlObj);
                    chrome.windows.update(incognitoWindow.id, { focused: true });
                } else {
                    chrome.windows.create({ url: urlObj.url, incognito: true });
                }
            });
        } else {
            chrome.windows.getLastFocused((window) => {
                createTabsInWindow(window.id, urlObj);
            });
        }
    });
}
