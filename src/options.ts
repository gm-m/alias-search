// @ts-nocheck
import browser from "webextension-polyfill";

type SearchEngine = {
    alias?: Alias,
    enableMultiAlias: boolean,
    incognitoMode: boolean,
    openAsUrl: boolean,
    prefillUrl: boolean,
    targetWindow: "_blank" | "_self";
};

type AliasProperties = {
    categories: string[] | null,
    hasPlaceholder: boolean,
    searchEngine: string,
    url: string;
};

type Alias = {
    [key: string]: AliasProperties;
};

type ActiveAlias = { "name": string; } & AliasProperties;

// let searchEngines: Partial<SearchEngine> = {};
let searchEngines: SearchEngine = {};

function loadSavedData() {
    browser.storage.sync.get("searchEnginesObj").then((result) => {
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

function getHtmlInputElById(id: string) {
    return document.getElementById(id) as HTMLInputElement | null;
}

function isChecked(id: string) {
    const checkbox = getHtmlInputElById(id);
    return checkbox ? checkbox.checked : false;
}

function setCheckboxValue(el: HTMLInputElement | null, value: boolean) {
    if (el) el.checked = value;
}

function saveSettings() {
    if (!searchEngines) {
        searchEngines = {
            targetWindow: isChecked('tab-settings-target-windows') ? '_blank' : '_self',
            openAsUrl: isChecked('tab-settings-open-as-url'),
            incognitoMode: isChecked('tab-settings-open-incognito-mode'),
            enableMultiAlias: isChecked('tab-settings-enable-multi-alias'),
            prefillUrl: isChecked('tab-settings-prefill-url')
        };
    }

    browser.storage.sync.set({ "searchEnginesObj": searchEngines });
}

function addAliasToDom(searchEnginesObj: ActiveAlias) {
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

    const aliasPlaceholder = aliasDiv.querySelector('#alias-placeholder') as HTMLInputElement | null;
    if (aliasPlaceholder) aliasPlaceholder.checked = hasPlaceholder;

    const divContainer = document.getElementById('display-content');
    if (divContainer) divContainer.appendChild(aliasDiv);
}

function updateAlias(div: HTMLDivElement) {
    const [name, url] = [div.querySelector('#alias-name').value, div.querySelector('#alias-url').value];
    if (!(searchEngines.alias && searchEngines.alias[name])) return;

    const hasPlaceholder = url.includes("%s");
    searchEngines.alias[name].url = url;
    searchEngines.alias[name].hasPlaceholder = hasPlaceholder;
    div.querySelector('#alias-placeholder').checked = hasPlaceholder;

    browser.storage.sync.set({ "searchEnginesObj": searchEngines });
}

function deleteAlias(name: string) {
    searchEngines.alias = Object.fromEntries(Object.entries(searchEngines.alias).filter(([key]) => key !== name));
    browser.storage.sync.set({ "searchEnginesObj": searchEngines }).then(() => {
        document.getElementById(name)?.remove();
        showData(hasAliases(searchEngines));
    });
}

function displayData(content: SearchEngine) {
    setCheckboxValue(getHtmlInputElById('tab-settings-target-windows'), searchEngines.targetWindow === '_blank');
    setCheckboxValue(getHtmlInputElById('tab-settings-open-as-url'), searchEngines.openAsUrl);
    setCheckboxValue(getHtmlInputElById('tab-settings-open-incognito-mode'), searchEngines.incognitoMode);
    setCheckboxValue(getHtmlInputElById('tab-settings-enable-multi-alias'), searchEngines.enableMultiAlias);
    setCheckboxValue(getHtmlInputElById('tab-settings-prefill-url'), searchEngines.prefillUrl);

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

function showData(flag: boolean) {
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

    browser.storage.sync.set({ "searchEnginesObj": searchEngines }).then(() => {
        addAliasToDom({ ...newAlias, name: aliasName });
        showData(true);
    });
}

function clearData() {
    if (confirm("Do you really want to delete all aliases?") === true) {
        browser.storage.sync.clear();
        searchEngines = {};

        showData(false);
    }
}

function displayCustomError(msg: string) {
    alert(msg);
    throw new Error(msg);
}

function hasAliases(obj) {
    return obj?.alias && Object.keys(obj.alias).length;
}

// EVENT LISTENERS

document.getElementById("btn-add-new-alias")?.addEventListener("click", createNewAlias);
document.getElementById("btn-save-settings")?.addEventListener("click", saveSettings);

document.getElementById("btn-reset")?.addEventListener("click", clearData);

document.getElementById("btn-import-json").onchange = ({ target }) => {
    const file = target.files[0];

    if (file) {
        new Response(file).json().then((fileContent) => {
            const mergedAliases = { ...searchEngines.alias, ...fileContent.alias };
            searchEngines = fileContent;
            searchEngines.alias = mergedAliases;

            browser.storage.sync.set({ "searchEnginesObj": searchEngines }).then(() => {
                loadSavedData();
            });
        });
    }
};

document.getElementById("btn-export-json")?.addEventListener("click", () => {
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
