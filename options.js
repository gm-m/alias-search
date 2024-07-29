let searchEngines = {};

function loadSavedData() {
    chrome.storage.sync.get("searchEnginesObj", (result) => {
        searchEngines = result.searchEnginesObj ?? { targetWindow: '_blank', openAsUrl: true };
        displayData(searchEngines);
    });
}

function saveSettings() {
    if (!searchEngines) searchEngines = {};
    searchEngines.targetWindow = document.getElementById('tab-settings').checked ? '_blank' : '_self';
    searchEngines.openAsUrl = document.getElementById('tab-settings-open-as-url').checked;

    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => { });
}

function addAliasToDom(searchEnginesObj) {
    const { name, searchEngine, url } = searchEnginesObj;

    const aliasDiv = document.createElement('div');
    aliasDiv.id = name;
    aliasDiv.className = "active-alias d-flex flex-column col-4 gap-2 mb-5";
    aliasDiv.innerHTML = `
    <input autocomplete="off" class="extended-name form-control" name="${searchEngine}" value="${searchEngine}" readonly>
    <input autocomplete="off" class="name form-control" name="${name}" value="${name}" readonly>
    <input id="alias-url" autocomplete="off" class="value form-control" name="${url}" value="${url}">
    <div class="d-flex gap-5">
        <button id="update-${name}" class="btn btn-secondary w-50 ${name}">Update</button>
        <button id="${name}" class="btn btn-danger w-50">Delete</button>
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
    searchEngines[targetClassName] = { searchEngine: aliasInput.value, url: urlInput.value };
    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => { });
}

function deleteAlias(event) {
    const targetId = event.target.id;

    searchEngines.alias = Object.fromEntries(Object.entries(searchEngines.alias).filter(([key]) => key !== targetId));
    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => {
        document.getElementById(targetId).remove();
        showData(hasAliases(searchEngines));
    });
}

function displayData(content) {
    document.getElementById('tab-settings').checked = searchEngines.targetWindow === '_blank';
    document.getElementById('tab-settings-open-as-url').checked = searchEngines.openAsUrl;

    if (hasAliases(content)) {
        for (const key in searchEngines.alias) {
            addAliasToDom({ name: key, searchEngine: searchEngines.alias[key].searchEngine, url: searchEngines.alias[key].url });
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
    if (!hasAliases(searchEngines)) searchEngines = { alias: {} };
    if (searchEngines.hasOwnProperty(newAlias.name)) displayCustomError("An alias with same name already exists");

    searchEngines.targetWindow = document.getElementById('tab-settings').checked ? '_blank' : '_self';
    searchEngines.openAsUrl = document.getElementById('tab-settings-open-as-url').checked;
    searchEngines.alias[newAlias.name] = { searchEngine: newAlias.searchEngine, url: newAlias.url };
    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => {
        addAliasToDom(newAlias);
        showData(true);
    });
}

function clearData() {
    if (confirm("Do you really want to delete all aliases?") === true) {
        chrome.storage.sync.clear();
        searchEngines = {};

        showData(false);
    }
}

function displayCustomError(msg) {
    alert(msg);
    throw new Error(msg);
}

function hasAliases(obj) {
    return obj?.alias && Object.keys(obj.alias).length;
}

document.getElementById("btn-save").addEventListener("click", createNewAlias);
document.getElementById("btn-save-settings").addEventListener("click", saveSettings);

document.getElementById("btn-reset").addEventListener("click", clearData);
document.getElementById("btn-export-json").addEventListener("click", () => {
    if (hasAliases(searchEngines)) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(searchEngines)], { type: 'application/json' }));
        a.download = 'aliases.json';
        a.click();
    } else {
        alert("No data to export");
    }
});

document.addEventListener('DOMContentLoaded', loadSavedData);
