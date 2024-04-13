let searchEngines = {};

function openPopup() {
  chrome.storage.sync.get("searchEnginesObj", (result) => {
    searchEngines = result.searchEnginesObj;
    if (!searchEngines.alias) return;
  });

  const popup = document.createElement('div');
  popup.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width:50%; z-index: 99"
  popup.innerHTML = `
    <div id="cstm-search">
      <input type="text" id="user-input" placeholder="Search..." autocomplete="off" style="width: 100%; padding: 10px; color: black; background-color: white; border: 1px solid black; font-family: sans-serif; font-size: medium; outline: none;">
      <span id="active-alias">No match found</span>
    </div>
  `;
  document.body.appendChild(popup);

  const userInputElement = popup.querySelector('#user-input');
  userInputElement.focus();

  userInputElement.addEventListener('input', function (event) {
    const inputText = event.target.value;
    const alias = inputText.substring(0, inputText.indexOf(' '));
    const previewAlias = alias && searchEngines.alias && searchEngines.alias.hasOwnProperty(alias) ? `${searchEngines.alias[alias].searchEngine} | Target: ${searchEngines.targetWindow}` : 'No match found';

    document.getElementById('active-alias').innerText = previewAlias;
  });

  this.addEventListener("keydown", (event) => {
    if (event.key === 'Escape') popup.remove();
  });

  document.getElementById('cstm-search').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      const userInput = document.getElementById('user-input').value;
      const alias = userInput.substring(0, userInput.indexOf(' '));
      const searchQuery = userInput.substring(alias.length).trim();
      if (!searchQuery) return;

      chrome.storage.sync.get("searchEnginesObj", (result) => {
        const searchEngines = result.searchEnginesObj;
        if (!searchEngines.alias) return;

        if (searchEngines.alias.hasOwnProperty(alias)) {
          const queryUrl = searchEngines.alias[alias].url.replace('%s', searchQuery);
          window.open(queryUrl, searchEngines.targetWindow)
        }
      });

      popup.remove();
    }
  });
}
