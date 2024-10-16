//@ts-nocheck
import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "openPopup") {
    openPopup();
  }
});

let searchEngines = {};
let cachedSearchPayload = { aliases: [], aliasDescriptions: [], searchQuery: '' };

const loadSearchEngines = () => {
  return browser.storage.sync.get("searchEnginesObj").then((result) => {
    searchEngines = result.searchEnginesObj ?? {
      targetWindow: '_blank',
      openAsUrl: true,
      incognitoMode: false,
      enableMultiAlias: false
    };
  });
};

const createPopupElement = () => {
  const popupContainer = document.createElement('div');
  popupContainer.attachShadow({ mode: 'open' });
  popupContainer.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 35%; z-index: 999999;";

  const style = document.createElement('style');
  style.textContent = `
        :host {all: initial;}
        .p-0 { padding: 0; }
        #modal { display: flex; }
        #user-input { width: 100%; }
        span, input {
            font-family: sans-serif;
            font-size: medium;
            color: #d1d0c5;
            background-color: #323437;
            border: none;
            border-radius: .5rem;
            outline: none;
        }
        div {
            background-color: #323437;
            padding: 12px;
        }
        #preview-alias {
          display: flex;
          justify-content: space-between;
        }

    `;

  const popup = document.createElement('div');
  popup.style = 'border-radius: .5rem;';
  popup.innerHTML = `
        <div id="modal">
            <span class="searchicon">&#x1F50E;&#xFE0E;</span>
            <input type="text" id="user-input" placeholder="Search..." autocomplete="off">
        </div>
        <hr>
        <div id="preview-alias" class="p-0">
            <span id="active-alias">No match found</span>
            <span id="incognito-mode">Incognito mode: ${searchEngines.incognitoMode ? 'On' : 'Off'}</span>
        </div>
    `;

  popupContainer.shadowRoot.appendChild(style);
  popupContainer.shadowRoot.appendChild(popup);

  return popupContainer;
};

async function openPopup() {
  await loadSearchEngines();

  const popupContainer = createPopupElement();
  document.body.appendChild(popupContainer);

  const userInputElement = popupContainer.shadowRoot.querySelector('#user-input');
  const activeAliasElement = popupContainer.shadowRoot.querySelector('#active-alias');

  if (searchEngines.prefillUrl) {
    browser.runtime.sendMessage({ action: 'getCurrentTabUrl' }, (response) => {
      const currentTabUrl = response.url || '';
      if (currentTabUrl) userInputElement.value = currentTabUrl;
    });
  }

  userInputElement.focus();
  userInputElement.addEventListener('keydown', (e) => e.stopPropagation());
  userInputElement.addEventListener('input', (e) => {
    cachedSearchPayload = parseAliases(e.target.value);
    activeAliasElement.innerText = getAliasDescription();
  });

  popupContainer.shadowRoot.querySelector("#modal").addEventListener('keyup', (e) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      handleUserInput(e);
      popupContainer.remove();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === 'Escape') popupContainer.remove();
  }, { capture: true });
}

const sendOpenTabsEvent = (urls) => {
  browser.runtime.sendMessage({
    action: "openTabs",
    urls: urls,
  });
};

const getTabOptions = (word) => {
  const settings = {
    incognito: searchEngines.incognitoMode,
    newTab: searchEngines.targetWindow
  };

  const settingsMap = {
    '!': 'incognito',
    '@': 'newTab'
  };

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const setting = settingsMap[char];

    if (!setting) break;

    if (word[i + 1] === char) {
      settings[setting] = false;
      i++;
    } else {
      settings[setting] = true;
    }
  }

  return settings;
};

const parseAliases = (inputText) => {
  const words = inputText.split(' ');
  const aliases = [];
  const aliasDescriptions = new Set();
  const categories = [];

  let searchQuery = '';

  for (const word of words) {
    if (!word && !searchQuery) continue; // Skip empty spaces unless they're part of the search query

    const tabOptions = getTabOptions(word);
    const cleanWord = word.replace(/^[!@]+/, '');

    if (searchEngines.alias.hasOwnProperty(cleanWord)) {
      if (!searchEngines.enableMultiAlias && aliases.length) {
        searchQuery = words.slice(words.indexOf(word)).join(' ');
        break;
      }

      aliases.push({ alias: cleanWord, ...tabOptions });
      aliasDescriptions.add(searchEngines.alias[cleanWord].searchEngine);

    } else { // If no alias are found, check if the word matches any category
      for (const alias in searchEngines.alias) {
        if (searchEngines.alias[alias].categories && searchEngines.alias[alias].categories.includes(cleanWord)) {
          categories.push(cleanWord);
          aliasDescriptions.add(`${cleanWord} (Category)`);
        }
      }
      searchQuery = words.slice(words.indexOf(word)).join(' ');

      break;
    }
  }

  return { aliases, aliasDescriptions: Array.from(aliasDescriptions), searchQuery, categories };
};

const getAliasDescription = () => {
  const { aliasDescriptions } = cachedSearchPayload;

  if (aliasDescriptions.length === 0) {
    return 'No match found';
  }

  return `${aliasDescriptions.join(' - ')} | Target: ${searchEngines.targetWindow}`;
};

const handleUserInput = (e) => {
  const { aliases, searchQuery, categories } = cachedSearchPayload;
  const urls = new Set(); // Use a Set to avoid duplicate URLs

  const addUrl = (alias, tabOptions) => {
    const targetUrl = alias.hasPlaceholder
      ? alias.url.replace('%s', encodeURIComponent(searchQuery))
      : alias.url;

    urls.add({ url: targetUrl, ...tabOptions });
  };

  // Add URLs for aliases directly mentioned in the search query
  aliases.forEach(({ alias: aliasName, incognito, newTab }) => {
    const alias = searchEngines.alias[aliasName];
    if (alias.hasPlaceholder && !searchQuery) return;

    addUrl(alias, { incognito, newTab });
  });

  // Add URLs for aliases linked to the specified categories
  if (categories.length > 0) {
    Object.keys(searchEngines.alias).forEach(aliasName => {
      const alias = searchEngines.alias[aliasName];
      if (alias.categories && alias.categories.some(category => categories.includes(category))) {
        addUrl(alias, { incognito: searchEngines.incognitoMode, newTab: searchEngines.targetWindow });
      }
    });
  }

  // If no aliases or categories matched, consider opening as URL if enabled
  if (urls.size === 0 && searchEngines.openAsUrl) {
    const url = !e.target.value.match(/^https?:\/\//i) ? 'https://' + e.target.value : e.target.value;
    urls.add({ url, incognito: searchEngines.incognitoMode, newTab: searchEngines.targetWindow });
  }

  if (urls.size > 0) sendOpenTabsEvent(Array.from(urls));
};
