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

    private getActiveAliasUrls(alias: ActiveAlias): string | null {
        if (alias.type === "placeholder") {
            return alias.placeholderUrl;
        } else if (alias.type === "link") {
            return alias.url;
        } else {
            return `${alias.url} | ${alias.placeholderUrl}`;
        }
    }

    addAliasToDom(searchEnginesObj: ActiveAlias): void {
        const { name, searchEngine, url, type, defaultAlias, categories, settings } = searchEnginesObj;
        const activeAliasUrls = this.getActiveAliasUrls(searchEnginesObj);

        const aliasDiv = document.createElement('div');
        aliasDiv.id = name;
        aliasDiv.className = "active-alias d-flex flex-column col-4 gap-2 mb-5";
        aliasDiv.innerHTML = `
        <input class="extended-name form-control" name="${searchEngine}" value="${searchEngine}" autocomplete="off" readonly>
        <input id="alias-name" class="name form-control" name="${name}" value="${name}" autocomplete="off" readonly>
        <input id="alias-url" autocomplete="off" class="value form-control" name="${url}" value="${activeAliasUrls}">
        <input id="alias-category" autocomplete="off" class="value form-control" value="${categories || 'No categories'}" readonly>
        <div class="form-check form-switch form-switch-xl">
            <div class="col">
                <input id="alias-placeholder" class="form-check-input" type="checkbox" disabled>
                <label class="form-check-label" for="alias-placeholder">Placeholder</label>
            </div>

            <div class="col">
                <input id="alias-link" class="form-check-input" type="checkbox" disabled>
                <label class="form-check-label" for="alias-link">Direct Link</label>
            </div>

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
        this.updateAliasCheckboxes(aliasDiv, type, getIndexOfExactMatch(name, defaultAlias) !== null);

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

    private updateAliasCheckboxes(aliasDiv: HTMLElement, type: ActiveAlias['type'], isDefaultAlias: boolean): void {
        const placeholder = aliasDiv.querySelector('#alias-placeholder') as HTMLInputElement;
        const directLink = aliasDiv.querySelector('#alias-link') as HTMLInputElement;
        const defaultAliasDomEl = aliasDiv.querySelector('#default-alias') as HTMLInputElement;

        if (placeholder) {
            placeholder.checked = type === "placeholder" || type === "multi";
        }

        if (directLink) {
            directLink.checked = type === "link" || type === "multi";
        }

        if (defaultAliasDomEl) {
            defaultAliasDomEl.checked = isDefaultAlias;
        }
    }

    // Method for updating checkboxes when converting to multi-alias
    updateMultiAliasCheckboxes(aliasName: string): void {
        const aliasDiv = document.getElementById(aliasName);
        if (aliasDiv) {
            aliasDiv.querySelectorAll('.form-check input').forEach(checkbox => {
                if (checkbox instanceof HTMLInputElement) {
                    checkbox.checked = true;
                }
            });
        }
    }

    private async handleUpdateAlias(aliasDiv: HTMLElement): Promise<void> {
        const aliasName = aliasDiv.querySelector('#alias-name') as HTMLInputElement;
        const urlInput = aliasDiv.querySelector('#alias-url') as HTMLInputElement;
        const defaultAliasCheckbox = aliasDiv.querySelector('#default-alias') as HTMLInputElement;
        const incognitoCheckbox = aliasDiv.querySelector(`#alias-incognito-${aliasName}`) as HTMLInputElement;
        const newTabCheckbox = aliasDiv.querySelector(`#alias-new-tab-${aliasName}`) as HTMLInputElement;

        if (!urlInput?.value) return;

        const settings = {
            incognitoMode: incognitoCheckbox?.checked,
            newTab: newTabCheckbox?.checked
        };

        await this.searchEngineService.updateAlias(
            aliasName,
            urlInput.value,
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
