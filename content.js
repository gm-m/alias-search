let searchEngines = {};
let cachedSearchPayload = { aliases: [], aliasDescriptions: [], searchQuery: '' };

const loadSearchEngines = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get("searchEnginesObj", (result) => {
      searchEngines = result.searchEnginesObj ?? {
        targetWindow: '_blank',
        openAsUrl: true,
        incognitoMode: false,
        enableMultiAlias: false
      };

      resolve();
    });
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
    `;

  const popup = document.createElement('div');
  popup.style = 'border-radius: .5rem;';
  popup.innerHTML = `
        <div id="modal">
            <span class="searchicon">&#x1F50E;&#xFE0E;</span>
            <input type="text" id="user-input" placeholder="Search..." autocomplete="off">
        </div>
        <hr>
        <div class="p-0">
            <span id="active-alias">No match found</span>
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

  userInputElement.focus();
  userInputElement.addEventListener('keydown', (e) => e.stopPropagation());
  userInputElement.addEventListener('input', (e) => {
    cachedSearchPayload = parseAliases(e.target.value);
    activeAliasElement.innerText = getAliasDescription();
  });

  popupContainer.shadowRoot.querySelector("#modal").addEventListener('keypress', (e) => {
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
  chrome.runtime.sendMessage({
    action: "openTabs",
    urls: urls,
    targetWindow: searchEngines.targetWindow,
    incognitoMode: searchEngines.incognitoMode
  });
};

const parseAliases = (inputText) => {
  const words = inputText.split(' ');
  const aliases = [];
  const aliasDescriptions = [];

  let searchQuery = '';

  for (const word of words) {
    if (searchEngines.alias.hasOwnProperty(word)) {
      if (!searchEngines.enableMultiAlias && aliases.length) {
        searchQuery = words.slice(words.indexOf(word)).join(' ');
        break;
      }

      aliases.push(word);
      aliasDescriptions.push(searchEngines.alias[word].searchEngine);
    } else {
      searchQuery = words.slice(words.indexOf(word)).join(' ');
      break;
    }
  }

  return { aliases, aliasDescriptions, searchQuery };
};

const getAliasDescription = () => {
  const { aliases, aliasDescriptions } = cachedSearchPayload;

  if (aliases.length === 0) {
    return 'No match found';
  }

  return `${aliasDescriptions.join(' - ')} | Target: ${searchEngines.targetWindow}`;
};

const handleUserInput = (e) => {
  const { aliases, searchQuery } = cachedSearchPayload;
  const urls = [];

  if (aliases.length === 0 && searchEngines.openAsUrl) {
    const url = !e.target.value.match(/^https?:\/\//i) ? 'https://' + e.target.value : e.target.value;
    urls.push(url);
  } else {
    aliases.forEach(aliasName => {
      const alias = searchEngines.alias[aliasName];
      if (alias.hasPlaceholder && !searchQuery) return;

      const targetUrl = alias.hasPlaceholder
        ? alias.url.replace('%s', encodeURIComponent(searchQuery))
        : alias.url;

      urls.push(targetUrl);
    });
  }

  if (urls.length) sendOpenTabsEvent(urls);
};
