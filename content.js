function openPopup() {
  const popup = document.createElement('div');
  popup.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width:50%; z-index: 99"
  popup.innerHTML = `
    <div id="cstmSearch">
      <input type="text" id="user-input" placeholder="Search..." autocomplete="off" style="width: 100%; padding: 10px; color: black; background-color: white; border: 1px solid black; font-family: sans-serif; font-size: medium; outline: none;">
    </div>
  `;
  document.body.appendChild(popup);
  popup.querySelector('#user-input').focus();

  this.addEventListener("keydown", (event) => {
    if (event.key === 'Escape') popup.remove();
  });

  document.getElementById('cstmSearch').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      const userInput = document.getElementById('user-input').value;
      const alias = userInput.substring(0, userInput.indexOf(' '));
      const searchQuery = userInput.substring(alias.length).trim();
      if (!searchQuery) return;

      chrome.storage.sync.get("aliasObj", (result) => {
        const savedAliases = result.aliasObj;
        if (!savedAliases) return;

        if (savedAliases.hasOwnProperty(alias)) {
          const queryUrl = savedAliases[alias].url.replace('%s', searchQuery);
          window.open(queryUrl, "_blank")
        }
      });

      popup.remove();
    }
  });
}
