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
    if (message.action === "openTab") {
        const openTab = () => {
            message.targetWindow === '_blank' ? chrome.tabs.create({ url: message.url, active: true }) : chrome.tabs.update({ url: message.url, active: true });
        }

        if (message.incognitoMode) {
            chrome.windows.getCurrent({}, function (currentWindow) {
                if (currentWindow.incognito) { // If already in an Incognito window, just open a new tab
                    openTab();
                } else { // If in a regular window, create a new Incognito window
                    chrome.windows.create({ url: message.url, incognito: true });
                }
            });
        } else {
            openTab();
        }
    }
});