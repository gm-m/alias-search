let savedAliases = {};

function loadSavedData() {
    chrome.storage.sync.get("aliasObj", (result) => {
        savedAliases = result.aliasObj;
        console.log(savedAliases);
        displayData(savedAliases);
    });
}

function addAliasToDom(aliasObj) {
    const { name, url } = aliasObj;

    const aliasDiv = document.createElement('div');
    aliasDiv.id = name;
    aliasDiv.className = "active-alias";
    aliasDiv.style = 'display: flex; flex-direction: column; width: calc(100% / 4); gap: 10px';

    aliasDiv.innerHTML = `
    <input autocomplete="off" class="name" name="${name}" value=${name} readonly>
    <input id="alias-url" autocomplete="off" class="value" name="${url}" value=${url}>
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
    savedAliases[targetClassName] = urlInput.value;
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
        for (const key in savedAliases) {
            addAliasToDom({ name: key, url: savedAliases[key] });
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

function pushData() {
    const newAlias = {
        searchEngine: document.getElementById('search-engine').value,
        name: document.getElementById('alias').value,
        url: document.getElementById('url').value,
    };

    if (!newAlias.name || !newAlias.url) displayCustomError("Fill all data");
    if (!newAlias.url.includes("%s")) displayCustomError("Url must includes %s");
    if (!savedAliases) savedAliases = {};
    if (savedAliases.hasOwnProperty(newAlias.name)) displayCustomError("An alias with same name already exists");

    savedAliases[newAlias.name] = newAlias.url;
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
    return obj && Object.keys(obj).length;
}

document.getElementById("btn-save").addEventListener("click", pushData);
document.getElementById("btn-reset").addEventListener("click", clearData);

document.addEventListener('DOMContentLoaded', loadSavedData);
