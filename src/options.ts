// @ts-nocheck
import browser from "webextension-polyfill";
import { getDefaultSearchEngines } from "./utility";

type SearchEngine = {
    alias?: Alias,
    enableMultiAlias: boolean,
    incognitoMode: boolean,
    openAsUrl: boolean,
    prefillUrl: boolean,
    targetWindow: "_blank" | "_self";
};

export type AliasProperties = {
    categories: string[] | null,
    type: "placeholder" | "link" | "multi";
    searchEngine: string,
    placeholderUrl: string | null,
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
        searchEngines = result.searchEnginesObj ?? getDefaultSearchEngines();
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
    searchEngines.targetWindow = isChecked('tab-settings-target-windows') ? '_blank' : '_self';
    searchEngines.openAsUrl = isChecked('tab-settings-open-as-url');
    searchEngines.incognitoMode = isChecked('tab-settings-open-incognito-mode');
    searchEngines.enableMultiAlias = isChecked('tab-settings-enable-multi-alias');
    searchEngines.prefillUrl = isChecked('tab-settings-prefill-url');

    browser.storage.sync.set({ "searchEnginesObj": searchEngines });
}

function getActiveAliasUrls(alias: ActiveAlias) {
    if (alias.type === "placeholder") {
        return alias.placeholderUrl;
    } else if (alias.type === "link") {
        return alias.url;
    } else {
        return `${alias.url} | ${alias.placeholderUrl}`;
    }
}

function addAliasToDom(searchEnginesObj: ActiveAlias) {
    const { name, searchEngine, url, type, categories } = searchEnginesObj;
    const activeAliasUrls = getActiveAliasUrls(searchEnginesObj);

    const aliasDiv = document.createElement('div');
    aliasDiv.id = name;
    aliasDiv.className = "active-alias d-flex flex-column col-4 gap-2 mb-5";
    aliasDiv.innerHTML = `
    <input class="extended-name form-control" name="${searchEngine}" value="${searchEngine}" autocomplete="off" readonly>
    <input id="alias-name" class="name form-control" name="${name}" value="${name}" autocomplete="off" readonly>
    <input id="alias-url" autocomplete="off" class="value form-control" name="${url}" value="${activeAliasUrls}">
    <input id="alias-category" autocomplete="off" class="value form-control" value="${categories || 'No categories'}" readonly>
    <div class="form-check form-switch form-switch-xl d-flex">
        <div class="col-6">
            <input id="alias-placeholder" class="form-check-input" type="checkbox" disabled>
            <label class="form-check-label" for="alias-placeholder">Placeholder</label>
        </div>

        <div class="col-6">
            <input id="alias-link" class="form-check-input" type="checkbox" disabled>
            <label class="form-check-label" for="alias-link">Direct Link</label>
        </div>
    </div>

    <div class="d-flex gap-5">
        <button id="update-${name}" class="btn btn-secondary w-50 ${name}">Update</button>
        <button id="delete-${name}" class="btn btn-danger w-50">Delete</button>
    </div>
    `;

    aliasDiv.querySelectorAll('button')[0].addEventListener("click", updateAlias.bind(this, aliasDiv), false);
    aliasDiv.querySelectorAll('button')[1].addEventListener("click", deleteAlias.bind(this, name), false);

    const aliasPlaceholder = aliasDiv.querySelector('#alias-placeholder') as HTMLInputElement | null;
    if (aliasPlaceholder) aliasPlaceholder.checked = type === "placeholder" | type === "multi";

    const aliasDirectLink = aliasDiv.querySelector('#alias-link') as HTMLInputElement | null;
    if (aliasDirectLink) aliasDirectLink.checked = type === "link" | type === "multi";

    const divContainer = document.getElementById('display-content');
    if (divContainer) divContainer.appendChild(aliasDiv);
}

function updateAlias(div: HTMLDivElement) {
    const [name, url] = [div.querySelector('#alias-name').value, div.querySelector('#alias-url').value];
    if (!(searchEngines.alias && searchEngines.alias[name])) return;

    const aliasType = getAliasType(url);
    searchEngines.alias[name].url = url;
    searchEngines.alias[name].type = aliasType;

    div.querySelector('#alias-placeholder').checked = aliasType === "placeholder";
    browser.storage.sync.set({ "searchEnginesObj": searchEngines });
}

function deleteAlias(name: string) {
    searchEngines.alias = Object.fromEntries(Object.entries(searchEngines.alias).filter(([key]) => key !== name));
    browser.storage.sync.set({ "searchEnginesObj": searchEngines }).then(() => {
        document.getElementById(name)?.remove();
        showData(hasAliases(searchEngines));
    });
}

function displaySettings() {
    setCheckboxValue(getHtmlInputElById('tab-settings-target-windows'), searchEngines.targetWindow === '_blank');
    setCheckboxValue(getHtmlInputElById('tab-settings-open-as-url'), searchEngines.openAsUrl);
    setCheckboxValue(getHtmlInputElById('tab-settings-open-incognito-mode'), searchEngines.incognitoMode);
    setCheckboxValue(getHtmlInputElById('tab-settings-enable-multi-alias'), searchEngines.enableMultiAlias);
    setCheckboxValue(getHtmlInputElById('tab-settings-prefill-url'), searchEngines.prefillUrl);
}

function displayActiveAliases(content: SearchEngine) {
    if (hasAliases(content)) {
        for (const key in searchEngines.alias) {
            addAliasToDom({
                name: key,
                searchEngine: searchEngines.alias[key].searchEngine,
                url: searchEngines.alias[key].url,
                placeholderUrl: searchEngines.alias[key].placeholderUrl,
                type: searchEngines.alias[key].type,
                categories: searchEngines.alias[key].categories
            });
        }
        showData(true);
    } else {
        showData(false);
    }
}

function displayData(content: SearchEngine) {
    displaySettings();
    displayActiveAliases(content);
}

function showData(flag: boolean) {
    if (!flag) document.getElementById('display-content').innerHTML = '';
    document.getElementById('display-empty').style.display = flag ? 'none' : 'block';
    document.getElementById('btn-reset').style.display = flag ? 'block' : 'none';
}

function getAliasType(url: string): Omit<AliasProperties['type'], "multi"> {
    return url.includes("%s") ? "placeholder" : "link";
}

function updateAliasCheckboxes(aliasName: string) {
    const aliasDiv = document.getElementById(aliasName);

    if (aliasDiv) {
        aliasDiv.querySelectorAll('.form-check input').forEach(checkbox => {
            setCheckboxValue(checkbox, true);
        });
    }
}

function createNewAlias() {
    const aliasUrl = document.getElementById('url').value;
    const aliasCategories = document.getElementById('categories').value;
    const aliasName = document.getElementById('alias').value;
    const newAlias = {
        searchEngine: document.getElementById('search-engine').value,
        type: getAliasType(aliasUrl),
        categories: aliasCategories ? aliasCategories.split(',').map(cat => cat.trim()) : null
    };

    if (!aliasName || !aliasUrl) displayCustomError("Fill all data");
    if (searchEngines.alias.hasOwnProperty(aliasName)) {
        if (searchEngines.alias[aliasName].type === newAlias.type) {
            displayCustomError("An alias with same name already exists");
        } else { // Support multiple alias with the same name if they're different
            newAlias.type = "multi";
        }
    }

    newAlias.type === "placeholder" ? newAlias.placeholderUrl = aliasUrl : newAlias.url = aliasUrl;
    searchEngines.alias[aliasName] = newAlias;

    browser.storage.sync.set({ "searchEnginesObj": searchEngines }).then(() => {
        newAlias.type === "multi" ? updateAliasCheckboxes(aliasName) : addAliasToDom({ ...newAlias, name: aliasName });
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
                displayData(searchEngines);
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
