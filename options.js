let searchEngines = {};

function loadSavedData() {
    chrome.storage.sync.get("searchEnginesObj", (result) => {
        searchEngines = result.searchEnginesObj ?? {
            targetWindow: '_blank',
            openAsUrl: true,
            incognitoMode: false,
            enableMultiAlias: false,
            prefillUrl: false
        };

        displayData(searchEngines);
    });
}

function saveSettings() {
    if (!searchEngines) searchEngines = {};
    searchEngines.targetWindow = document.getElementById('tab-settings-target-windows').checked ? '_blank' : '_self';
    searchEngines.openAsUrl = document.getElementById('tab-settings-open-as-url').checked;
    searchEngines.incognitoMode = document.getElementById('tab-settings-open-incognito-mode').checked;
    searchEngines.enableMultiAlias = document.getElementById('tab-settings-enable-multi-alias').checked;
    searchEngines.prefillUrl = document.getElementById('tab-settings-prefill-url').checked;

    chrome.storage.sync.set({ "searchEnginesObj": searchEngines });
}

function addAliasToDom(searchEnginesObj) {
    const { name, searchEngine, url, hasPlaceholder, categories } = searchEnginesObj;
    const aliasDiv = document.createElement('div');
    aliasDiv.id = name;
    aliasDiv.className = "active-alias d-flex flex-column col-4 gap-2 mb-5";
    aliasDiv.innerHTML = `
    <input class="extended-name form-control" name="${searchEngine}" value="${searchEngine}" autocomplete="off" readonly>
    <input id="alias-name" class="name form-control" name="${name}" value="${name}" autocomplete="off" readonly>
    <input id="alias-url" autocomplete="off" class="value form-control" name="${url}" value="${url}">
    <input id="alias-category" autocomplete="off" class="value form-control" value="${categories || 'No categories'}" readonly>
    <div class="form-check form-switch form-switch-xl">
        <input id="alias-placeholder" class="form-check-input" type="checkbox" disabled>
        <label class="form-check-label" for="alias-placeholder">Placeholder</label>
    </div>

    <div class="d-flex gap-5">
        <button id="update-${name}" class="btn btn-secondary w-50 ${name}">Update</button>
        <button id="delete-${name}" class="btn btn-danger w-50">Delete</button>
    </div>
    `;

    aliasDiv.querySelectorAll('button')[0].addEventListener("click", updateAlias.bind(this, aliasDiv), false);
    aliasDiv.querySelectorAll('button')[1].addEventListener("click", deleteAlias.bind(this, name), false);
    aliasDiv.querySelector('#alias-placeholder').checked = hasPlaceholder;

    const divContainer = document.getElementById('display-content');
    divContainer.appendChild(aliasDiv);
}

function updateAlias(div) {
    const [name, url] = [div.querySelector('#alias-name').value, div.querySelector('#alias-url').value];
    const hasPlaceholder = url.includes("%s");

    searchEngines.alias[name].url = url;
    searchEngines.alias[name].hasPlaceholder = hasPlaceholder;
    div.querySelector('#alias-placeholder').checked = hasPlaceholder;

    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => { });
}

function deleteAlias(name) {
    searchEngines.alias = Object.fromEntries(Object.entries(searchEngines.alias).filter(([key]) => key !== name));
    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => {
        document.getElementById(name).remove();
        showData(hasAliases(searchEngines));
    });
}

function displayData(content) {
    document.getElementById('tab-settings-target-windows').checked = searchEngines.targetWindow === '_blank';
    document.getElementById('tab-settings-open-as-url').checked = searchEngines.openAsUrl;
    document.getElementById('tab-settings-open-incognito-mode').checked = searchEngines.incognitoMode;
    document.getElementById('tab-settings-enable-multi-alias').checked = searchEngines.enableMultiAlias;
    document.getElementById('tab-settings-prefill-url').checked = searchEngines.prefillUrl;

    if (hasAliases(content)) {
        for (const key in searchEngines.alias) {
            addAliasToDom({
                name: key,
                searchEngine: searchEngines.alias[key].searchEngine,
                url: searchEngines.alias[key].url,
                hasPlaceholder: searchEngines.alias[key].hasPlaceholder,
                categories: searchEngines.alias[key].categories
            });
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
    const aliasUrlDomEl = document.getElementById('url');
    const aliasCategories = document.getElementById('categories').value;
    const aliasName = document.getElementById('alias').value;
    const newAlias = {
        searchEngine: document.getElementById('search-engine').value,
        url: aliasUrlDomEl.value,
        hasPlaceholder: aliasUrlDomEl.value && aliasUrlDomEl.value.includes("%s"),
        categories: aliasCategories ? aliasCategories.split(',').map(cat => cat.trim()) : null
    };

    if (!aliasName || !newAlias.url) displayCustomError("Fill all data");
    if (!hasAliases(searchEngines)) searchEngines = { alias: {} };
    if (searchEngines.alias.hasOwnProperty(aliasName)) displayCustomError("An alias with same name already exists");

    searchEngines.alias[aliasName] = newAlias;

    chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => {
        addAliasToDom({ ...newAlias, name: aliasName });
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

// EVENT LISTENERS

document.getElementById("btn-add-new-alias").addEventListener("click", createNewAlias);
document.getElementById("btn-save-settings").addEventListener("click", saveSettings);

document.getElementById("btn-reset").addEventListener("click", clearData);
document.getElementById("btn-import-json").onchange = ({ target }) => {
    const file = target.files[0];

    if (file) {
        new Response(file).json().then((fileContent) => {
            const mergedAliases = { ...searchEngines.alias, ...fileContent.alias };
            searchEngines = fileContent;
            searchEngines.alias = mergedAliases;

            chrome.storage.sync.set({ "searchEnginesObj": searchEngines }, () => {
                loadSavedData();
            });
        });
    }
}
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
