import { SearchEngineService } from '../services/search-engine.service';
import { ActiveAlias, SearchEngine } from '../services/types';
import { getIndexOfExactMatch } from '../utility';
import { DomHelpers } from './dom-helpers';

export class SettingsUI {
    private searchEngineService: SearchEngineService;

    constructor(searchEngineService: SearchEngineService) {
        this.searchEngineService = searchEngineService;
    }

    displayData(content: SearchEngine): void {
        this.displaySettings(content);
        this.displayActiveAliases(content);
    }

    displaySettings(searchEngines: SearchEngine): void {
        DomHelpers.setCheckboxValue('tab-settings-target-windows', searchEngines.targetWindow === '_blank');
        DomHelpers.setCheckboxValue('tab-settings-open-as-url', searchEngines.openAsUrl);
        DomHelpers.setCheckboxValue('tab-settings-open-incognito-mode', searchEngines.incognitoMode);
        DomHelpers.setCheckboxValue('tab-settings-enable-multi-alias', searchEngines.enableMultiAlias);
        DomHelpers.setCheckboxValue('tab-settings-prefill-url', searchEngines.prefillUrl);
    }

    displayActiveAliases(content: SearchEngine): void {
        if (this.searchEngineService.hasAliases()) {
            for (const key in content.alias) {
                this.addAliasToDom({
                    name: key,
                    defaultAlias: content.defaultAlias,
                    ...content.alias[key]
                });
            }
            this.updateUIVisibility(true);
        } else {
            this.updateUIVisibility(false);
        }
    }

    addAliasToDom(searchEnginesObj: ActiveAlias): void {
        const { name, searchEngine, url, placeholderUrl, defaultAlias, categories, settings } = searchEnginesObj;

        const aliasDiv = document.createElement('div');
        aliasDiv.id = name;
        aliasDiv.className = "active-alias d-flex flex-column col-4 gap-2 mb-5";
        aliasDiv.innerHTML = `
        <label for="alias-search-engine">Name</label>
        <input id="alias-search-engine" class="extended-name form-control" name="${searchEngine}" value="${searchEngine}" autocomplete="off" readonly>

        <label for="alias-name">Alias</label>
        <input id="alias-name" class="name form-control" name="${name}" value="${name}" autocomplete="off" readonly>

        <label for="alias-direct-link">Direct Link</label>
        <input id="alias-direct-link" autocomplete="off" class="value form-control" name="${url}" value="${url || ''}" ${!url ? 'readonly' : ''}>

        <label for="alias-placeholder-url">Placeholder URL</label>
        <input id="alias-placeholder-url" autocomplete="off" class="value form-control" name="${placeholderUrl}" value="${placeholderUrl || ''}" ${!placeholderUrl ? 'readonly' : ''}>

        <label for="alias-category">Categories</label>
        <input id="alias-category" autocomplete="off" class="value form-control" value="${categories || 'No categories'}" readonly>

        <div class="form-check form-switch form-switch-xl">
            <div class="col">
                <input id="default-alias" class="form-check-input" type="checkbox">
                <label class="form-check-label" for="default-alias">Default Alias</label>
            </div>

            <div class="col">
                <input id="alias-incognito-${name}" class="form-check-input" type="checkbox" ${settings?.incognitoMode ? 'checked' : ''}>
                <label class="form-check-label" for="alias-incognito-${name}">Always open in Incognito mode</label>
            </div>

            <div class="col">
                <input id="alias-new-tab-${name}" class="form-check-input" type="checkbox" ${settings?.newTab ? 'checked' : ''}>
                <label class="form-check-label" for="alias-new-tab-${name}">Always open in new tab</label>
            </div>
        </div>

        <div class="d-flex gap-5">
            <button id="update-${name}" class="btn btn-secondary w-50 ${name}">Update</button>
            <button id="delete-${name}" class="btn btn-danger w-50">Delete</button>
        </div>
        `;

        this.attachAliasEventListeners(aliasDiv, name);
        this.updateAliasCheckboxes(aliasDiv, getIndexOfExactMatch(name, defaultAlias) !== null);

        const divContainer = document.getElementById('display-content');
        if (divContainer) divContainer.appendChild(aliasDiv);
    }

    private attachAliasEventListeners(aliasDiv: HTMLElement, name: string): void {
        const updateButton = aliasDiv.querySelector(`#update-${name}`);
        const deleteButton = aliasDiv.querySelector(`#delete-${name}`);

        if (updateButton) {
            updateButton.addEventListener("click", () => this.handleUpdateAlias(aliasDiv));
        }

        if (deleteButton) {
            deleteButton.addEventListener("click", () => this.handleDeleteAlias(name));
        }
    }

    private updateAliasCheckboxes(aliasDiv: HTMLElement, isDefaultAlias: boolean): void {
        const defaultAliasDomEl = aliasDiv.querySelector('#default-alias') as HTMLInputElement;

        if (defaultAliasDomEl) {
            defaultAliasDomEl.checked = isDefaultAlias;
        }
    }

    private async handleUpdateAlias(aliasDiv: HTMLElement): Promise<void> {
        const aliasName = aliasDiv.querySelector('#alias-name') as HTMLInputElement;
        const directLink = aliasDiv.querySelector('#alias-direct-link') as HTMLInputElement;
        const placeholderUrl = aliasDiv.querySelector('#alias-placeholder-url') as HTMLInputElement;
        const defaultAliasCheckbox = aliasDiv.querySelector('#default-alias') as HTMLInputElement;

        const settings = {
            incognitoMode: DomHelpers.isChecked(`alias-incognito-${aliasName.value}`),
            newTab: DomHelpers.isChecked(`alias-new-tab-${aliasName.value}`)
        };

        await this.searchEngineService.updateAlias(
            aliasName.value,
            directLink.value,
            placeholderUrl.value,
            defaultAliasCheckbox?.checked || false,
            settings
        );
    }

    private async handleDeleteAlias(name: string): Promise<void> {
        await this.searchEngineService.deleteAlias(name);
        document.getElementById(name)?.remove();

        this.updateUIVisibility(this.searchEngineService.hasAliases());
    }

    updateUIVisibility(hasAliases: boolean): void {
        if (!hasAliases) {
            const displayContent = document.getElementById('display-content');
            if (displayContent) displayContent.innerHTML = '';
        }

        DomHelpers.showElement('display-empty', !hasAliases);
        DomHelpers.showElement('btn-reset', hasAliases);
    }
}
