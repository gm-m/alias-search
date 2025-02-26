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
        this.displayActiveCategories(content);
    }

    displaySettings(searchEngines: SearchEngine): void {
        DomHelpers.setCheckboxValue('tab-settings-target-windows', searchEngines.targetWindow === '_blank');
        DomHelpers.setCheckboxValue('tab-settings-open-as-url', searchEngines.openAsUrl);
        DomHelpers.setCheckboxValue('tab-settings-open-incognito-mode', searchEngines.incognitoMode);
        DomHelpers.setCheckboxValue('tab-settings-enable-multi-alias', searchEngines.enableMultiAlias);
        DomHelpers.setCheckboxValue('tab-settings-prefill-url', searchEngines.prefillUrl);
    }

    private displayActiveAliases(content: SearchEngine): void {
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

    private displayActiveCategories(content: SearchEngine): void {
        const displayCategories = document.getElementById('display-categories');
        if (!displayCategories) return;

        // Get all unique categories
        const categories = new Set<string>();
        for (const alias of Object.values(content.alias)) {
            if (alias.categories) {
                alias.categories.forEach(cat => categories.add(cat));
            }
        }

        displayCategories.innerHTML = '';
        if (categories.size > 0) {
            for (const category of categories) {
                // Get all aliases in this category
                const categoryAliases = Object.entries(content.alias)
                    .filter(([_, alias]) => alias.categories?.includes(category))
                    .map(([name, alias]) => ({
                        name,
                        settings: alias.settings,
                        searchEngine: alias.searchEngine
                    }));

                this.addCategoryToDom(category, categoryAliases);
            }
            DomHelpers.showElement('display-empty-categories', false);
        } else {
            DomHelpers.showElement('display-empty-categories', true);
        }
    }

    addAliasToDom(searchEnginesObj: ActiveAlias): void {
        const { name, searchEngine, url, placeholderUrl, defaultAlias, categories, settings } = searchEnginesObj;

        const aliasDiv = document.createElement('div');
        aliasDiv.id = name;
        aliasDiv.className = "active-alias d-flex flex-column col-4 gap-2 mb-5";
        aliasDiv.innerHTML = `
        <label for="alias-search-engine" class="fw-bold">Name</label>
        <input id="alias-search-engine" class="extended-name form-control" name="${searchEngine}" value="${searchEngine}" autocomplete="off" readonly>

        <label for="alias-name" class="fw-bold">Alias</label>
        <input id="alias-name" class="name form-control" name="${name}" value="${name}" autocomplete="off" readonly>

        <label for="alias-direct-link" class="fw-bold">Direct Link</label>
        <input id="alias-direct-link" autocomplete="off" class="value form-control" name="${url}" value="${url || ''}" ${!url ? 'readonly' : ''}>

        <label for="alias-placeholder-url" class="fw-bold">Placeholder URL</label>
        <input id="alias-placeholder-url" autocomplete="off" class="value form-control" name="${placeholderUrl}" value="${placeholderUrl || ''}" ${!placeholderUrl ? 'readonly' : ''}>

        <label for="alias-category" class="fw-bold">Categories</label>
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

    addCategoryToDom(category: string, aliases: { name: string; settings: any; searchEngine: string }[]): void {
        const categoryDiv = document.createElement('div');
        categoryDiv.id = `category-${category}`;
        categoryDiv.className = "active-category d-flex flex-column col-4 gap-2 mb-5";

        // Get current search engines to check for existing category settings
        const searchEngines = this.searchEngineService.getSearchEngines();
        const categorySettings = searchEngines.categorySettings?.[category];

        // Calculate combined settings from aliases (for display purposes)
        const combinedSettings = aliases.reduce(
            (acc, alias) => ({
                incognitoMode: acc.incognitoMode || alias.settings?.incognitoMode || false,
                // Only consider newTab as true if explicitly set to true
                newTab: acc.newTab || alias.settings?.newTab === true
            }),
            { incognitoMode: false, newTab: false }
        );

        categoryDiv.innerHTML = `
            <div class="category-header">
                <h5>${category}</h5>
            </div>
            <div class="category-content" role="region" aria-labelledby="category-header-${category}">
                <div class="included-aliases">
                    ${aliases.map(alias => `
                        <div class="alias-item">
                            <span class="badge bg-primary me-2">${alias.name}</span>
                            <small class="text-muted">${alias.searchEngine}</small>
                        </div>
                    `).join('')}
                </div>

                <div class="settings-group mt-3">
                    <h6 class="mb-2">Inherited Settings (Read-only)</h6>
                    <div class="form-check form-switch mb-3">
                        <input id="category-inherited-incognito-${category}" class="form-check-input" type="checkbox" ${combinedSettings.incognitoMode ? 'checked' : ''} disabled>
                        <label class="form-check-label" for="category-inherited-incognito-${category}">
                            Opens in Incognito mode
                            <small class="text-muted">(inherited from aliases)</small>
                        </label>
                    </div>

                    <div class="form-check form-switch mb-4">
                        <input id="category-inherited-new-tab-${category}" class="form-check-input" type="checkbox" ${combinedSettings.newTab ? 'checked' : ''} disabled>
                        <label class="form-check-label" for="category-inherited-new-tab-${category}">
                            Opens in new tab
                            <small class="text-muted">(inherited from aliases)</small>
                        </label>
                    </div>

                    <h6 class="mb-2">Category Settings</h6>
                    <div class="form-check form-switch mb-3">
                        <input id="category-incognito-${category}" class="form-check-input" type="checkbox" ${categorySettings?.incognitoMode ? 'checked' : ''}>
                        <label class="form-check-label" for="category-incognito-${category}">
                            Always open in Incognito mode
                        </label>
                    </div>

                    <div class="form-check form-switch mb-3">
                        <input id="category-new-tab-${category}" class="form-check-input" type="checkbox" ${categorySettings?.newTab ? 'checked' : ''}>
                        <label class="form-check-label" for="category-new-tab-${category}">
                            Always open in new tab
                        </label>
                    </div>

                    <button id="update-category-${category}" class="btn btn-secondary">Update Category Settings</button>
                </div>
            </div>
        `;

        // Add event listener for the update button
        this.attachCategoryEventListeners(categoryDiv, category);

        const divContainer = document.getElementById('display-categories');
        if (divContainer) divContainer.appendChild(categoryDiv);
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

    private updateUIVisibility(hasAliases: boolean): void {
        if (!hasAliases) {
            const displayContent = document.getElementById('display-content');
            if (displayContent) displayContent.innerHTML = '';
        }

        DomHelpers.showElement('display-empty', !hasAliases);
        DomHelpers.showElement('btn-reset', hasAliases);
    }

    private attachCategoryEventListeners(categoryDiv: HTMLElement, category: string): void {
        const updateButton = categoryDiv.querySelector(`#update-category-${category}`);
        
        if (updateButton) {
            updateButton.addEventListener("click", () => this.handleUpdateCategorySettings(categoryDiv, category));
        }
    }

    private async handleUpdateCategorySettings(categoryDiv: HTMLElement, category: string): Promise<void> {
        const incognitoMode = DomHelpers.isChecked(`category-incognito-${category}`);
        const newTab = DomHelpers.isChecked(`category-new-tab-${category}`);

        try {
            await this.searchEngineService.updateCategorySettings(category, {
                incognitoMode,
                newTab
            });
            
            // Show success message
            const updateButton = categoryDiv.querySelector(`#update-category-${category}`) as HTMLButtonElement;
            if (updateButton) {
                const originalText = updateButton.textContent;
                updateButton.textContent = "Settings Saved!";
                updateButton.classList.remove("btn-secondary");
                updateButton.classList.add("btn-success");
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    updateButton.textContent = originalText;
                    updateButton.classList.remove("btn-success");
                    updateButton.classList.add("btn-secondary");
                }, 2000);
            }
        } catch (error) {
            console.error("Failed to update category settings:", error);
            alert("Failed to update category settings. Please try again.");
        }
    }
}
