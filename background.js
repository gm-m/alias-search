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
    if (message.action !== "openTabs") return;

    const { urls, targetWindow, incognitoMode } = message;
    const createTabsInWindow = (windowId) => {
        urls.forEach((url) => {
            if (targetWindow === '_blank') {
                chrome.tabs.create({ url, windowId, active: true });
            } else {
                chrome.windows.update(windowId, { focused: true });
                chrome.tabs.update({ url, active: true });
            }
        });
    };

    if (incognitoMode) {
        chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
            const incognitoWindow = windows.find((window) => window.incognito);
            if (incognitoWindow) {
                createTabsInWindow(incognitoWindow.id);
                chrome.windows.update(incognitoWindow.id, { focused: true });
            } else {
                chrome.windows.create({ url: urls, incognito: true });
            }
        });
    } else {
        chrome.windows.getLastFocused((window) => {
            createTabsInWindow(window.id);
        });
    }
});
