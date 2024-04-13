let savedAliases = {};

function loadSavedData() {
    chrome.storage.sync.get("aliasObj", (result) => {
        savedAliases = result.aliasObj;
        displayData(savedAliases);
    });
}

function saveSettings() {
    if (!savedAliases) savedAliases = {};
    savedAliases.targetWindow = document.getElementById('tab-settings').checked ? '_blank' : '_self';

    chrome.storage.sync.set({ "aliasObj": savedAliases }, () => { });
}

function addAliasToDom(aliasObj) {
    const { name, searchEngine, url } = aliasObj;

    const aliasDiv = document.createElement('div');
    aliasDiv.id = name;
    aliasDiv.className = "active-alias";
    aliasDiv.style = 'display: flex; flex-direction: column; width: calc(100% / 4); gap: 10px';

    aliasDiv.innerHTML = `
    <input autocomplete="off" class="extended-name" name="${searchEngine}" value="${searchEngine}" readonly>
    <input autocomplete="off" class="name" name="${name}" value="${name}" readonly>
    <input id="alias-url" autocomplete="off" class="value" name="${url}" value="${url}">
    <div style="display: flex; gap: 10px;">
        <button id="update-${name}" class="${name}" style="width: 50%">Update</button>
        <button id="${name}" style="width: 50%">Delete</button>
    </div>
    `;

    aliasDiv.querySelectorAll('button')[0].addEventListener("click", updateAlias, false);
    aliasDiv.querySelectorAll('button')[1].addEventListener("click", deleteAlias, false);

    const divContainer = document.getElementById('display-content');
    divContainer.appendChild(aliasDiv);
}

function updateAlias(event) {
    const targetClassName = event.target.className;
    const targetInput = document.querySelectorAll(`#display-content #${targetClassName} input`);
    const [aliasInput, urlInput] = targetInput;

    if (!urlInput.value.includes("%s")) displayCustomError("Url must includes %s");
    savedAliases[targetClassName] = { searchEngine: aliasInput.value, url: urlInput.value };
    chrome.storage.sync.set({ "aliasObj": savedAliases }, () => { });
}

function deleteAlias(event) {
    const targetId = event.target.id;

    const activeAliasesNodeList = document.querySelectorAll('#display-content .active-alias');
    let activeAliases = {};
    activeAliasesNodeList.forEach((divEl) => {
        const alias = {
            name: divEl.querySelector('.name').value,
            value: divEl.querySelector('.value').value,
        }

        if (alias.name !== targetId) activeAliases[alias.name] = alias.value;
    })

    savedAliases = activeAliases;
    chrome.storage.sync.set({ "aliasObj": savedAliases }, () => {
        document.getElementById(targetId).remove();
        showData(isObjectNotEmpty(savedAliases));
    });
}

function displayData(content) {
    if (isObjectNotEmpty(content)) {
        document.getElementById('tab-settings').checked = savedAliases.targetWindow === '_blank';
        for (const key in savedAliases.activeAliases) {
            addAliasToDom({ name: key, searchEngine: savedAliases.activeAliases[key].searchEngine, url: savedAliases.activeAliases[key].url });
        }
        showData(true);
    } else {
        showData(false);
    }
}

function showData(flag) {
    if (!flag) document.getElementById('display-content').innerHTML = '';
    document.getElementById('display-empty').style.display = flag ? 'none' : 'block';
    document.getElementById('btn-reset').style.display = flag ? 'block' : 'none';
}

function createNewAlias() {
    const newAlias = {
        searchEngine: document.getElementById('search-engine').value,
        name: document.getElementById('alias').value,
        url: document.getElementById('url').value,
    };

    if (!newAlias.name || !newAlias.url) displayCustomError("Fill all data");
    if (!newAlias.url.includes("%s")) displayCustomError("Url must includes %s");
    if (!isObjectNotEmpty(savedAliases)) savedAliases = { activeAliases: {} };
    if (savedAliases.hasOwnProperty(newAlias.name)) displayCustomError("An alias with same name already exists");

    savedAliases.targetWindow = document.getElementById('tab-settings').checked ? '_blank' : '_self';
    savedAliases.activeAliases[newAlias.name] = { searchEngine: newAlias.searchEngine, url: newAlias.url };
    chrome.storage.sync.set({ "aliasObj": savedAliases }, () => {
        addAliasToDom(newAlias);
        showData(true);
    });
}

function clearData() {
    if (confirm("Do you really want to delete all aliases?") === true) {
        chrome.storage.sync.clear();
        savedAliases = {};

        showData(false);
    }
}

function displayCustomError(msg) {
    alert(msg);
    throw new Error(msg);
}

function isObjectNotEmpty(obj) {
    return obj?.activeAliases && Object.keys(obj.activeAliases).length;
}

document.getElementById("btn-save").addEventListener("click", createNewAlias);
document.getElementById("btn-save-settings").addEventListener("click", saveSettings);

document.getElementById("btn-reset").addEventListener("click", clearData);
document.getElementById("btn-export-json").addEventListener("click", () => {
    if (isObjectNotEmpty(savedAliases)) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(savedAliases)], { type: 'application/json' }));
        a.download = 'aliases.json';
        a.click();
    } else {
        alert("No data to export");
    }
});

document.addEventListener('DOMContentLoaded', loadSavedData);
