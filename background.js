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
    if (message.action === "openTabs") {
        const { urls } = message;

        const openTabs = (windowId) => {
            urls.forEach(url => {
                if (targetWindow === '_blank') {
                    chrome.tabs.create({ url: url, windowId: windowId });
                } else {
                    chrome.tabs.query({ active: true, windowId: windowId }, ([activeTab]) => {
                        if (activeTab) {
                            chrome.tabs.update(activeTab.id, { url: url });
                        } else {
                            chrome.tabs.create({ url: url, windowId: windowId });
                        }
                    });
                }
            });
        };

        if (message.incognitoMode) {
            chrome.windows.getCurrent({}, function (currentWindow) {
                if (currentWindow.incognito) {
                    openTabs(currentWindow.id);
                } else {
                    chrome.windows.create({ url: urls[0], incognito: true }, (newWindow) => {
                        if (urls.length > 1) {
                            urls.slice(1).forEach(url => {
                                chrome.tabs.create({ url: url, windowId: newWindow.id });
                            });
                        }
                    });
                }
            });
        } else {
            openTabs();
        }
    }
});