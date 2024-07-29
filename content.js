let searchEngines = {};

function openPopup() {
  chrome.storage.sync.get("searchEnginesObj", (result) => {
    searchEngines = result.searchEnginesObj ?? { targetWindow: '_blank', openAsUrl: true };
  });

  const popupContainer = document.createElement('div');
  popupContainer.attachShadow({ mode: 'open' });
  if (popupContainer.shadowRoot) {
    popupContainer.shadowRoot.innerHTML = `<style>:host {all: initial;}</style>`
  }

  const popup = document.createElement('div');
  popup.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30%; z-index: 999999;"
  popup.innerHTML = `
      <div id="cstm-search">
        <input type="text" id="user-input" placeholder="Search..." autocomplete="off" style="width: 100%; border-radius: 5px 5px 0 0; border-right: black; padding: 10px; color: #dee2e3; background-color: #1f1f1f; border-bottom: 1px solid black; font-family: sans-serif; font-size: medium; outline: none;">
        <div style="width: 100%; padding: 0 10px 0; border-radius: 0 0 5px 5px; background-color: #1f1f1f; border: 1px solid #1f1f1f;">
          <span id="active-alias" style="color: #dee2e3;">No match found</span>
        </div>
      </div>
  `;

  popupContainer.shadowRoot.appendChild(popup);
  document.body.appendChild(popupContainer);

  const userInputElement = popup.querySelector('#user-input');
  userInputElement.focus();

  userInputElement.addEventListener('input', function (event) {
    event.stopPropagation();
    const inputText = event.target.value;
    const alias = inputText.substring(0, inputText.indexOf(' '));
    const previewAlias = alias && searchEngines.alias && searchEngines.alias.hasOwnProperty(alias) ? `${searchEngines.alias[alias].searchEngine} | Target: ${searchEngines.targetWindow}` : 'No match found';

    popup.querySelector('#active-alias').innerText = previewAlias;
  });

  userInputElement.addEventListener('keydown', function(event) {
    event.stopPropagation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === 'Escape') popupContainer.remove();
  }, { capture: true });

  popup.querySelector("#cstm-search").addEventListener('keypress', function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const userInput = popup.querySelector('#user-input').value;
      const alias = userInput.substring(0, userInput.indexOf(' '));
      const searchQuery = userInput.substring(alias.length).trim();
      if (!searchQuery) return;

      if (!alias && searchEngines.openAsUrl) {
        const targetUrl = !searchQuery.match(/^https?:\/\//i) ? 'https://' + searchQuery : searchQuery;
        window.open(targetUrl, searchEngines.targetWindow);
      } else if (searchEngines.alias?.hasOwnProperty(alias)) {
        const targetUrl = searchEngines.alias[alias].url.replace('%s', searchQuery);
        window.open(targetUrl, searchEngines.targetWindow);
      }

      popupContainer.remove();
    }
  });
}