import browser from "webextension-polyfill";
import { AliasProperties, SearchEngine } from "./types";
import { getDefaultSearchEngines, getIndexOfExactMatch } from "../utility";

export class SearchEngineService {
    private searchEngines: SearchEngine = getDefaultSearchEngines();

    async loadSavedData(): Promise<SearchEngine> {
        const result = await browser.storage.sync.get("searchEnginesObj");
        if (result?.searchEnginesObj) {
            this.searchEngines = result.searchEnginesObj;
        }

        return this.searchEngines;
    }

    async saveSettings(settings: Omit<SearchEngine, 'alias' | 'defaultAlias'>): Promise<void> {
        Object.assign(this.searchEngines, settings);
        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });
    }

    async createAlias(
        aliasName: string, 
        aliasUrl: string, 
        searchEngineName: string, 
        categories: string,
        settings?: AliasProperties['settings']
    ): Promise<AliasProperties> {
        if (!aliasName || !aliasUrl) {
            throw new Error("Fill all data");
        }

        const aliasCategories = categories ? categories.split(',').map(cat => cat.trim()) : null;
        const aliasType = this.getAliasType(aliasUrl);

        const newAlias = {
            searchEngine: searchEngineName,
            type: aliasType,
            categories: aliasCategories,
            settings
        } as AliasProperties;

        if (this.searchEngines.alias[aliasName]) {
            if (this.searchEngines.alias[aliasName].type === aliasType) {
                throw new Error("An alias with same name already exists");
            }
            newAlias.type = "multi";
        }

        if (aliasType === "placeholder") {
            newAlias.placeholderUrl = aliasUrl;
        } else {
            newAlias.url = aliasUrl;
        }

        this.searchEngines.alias[aliasName] = newAlias;
        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });

        return newAlias;
    }

    async updateAlias(
        name: string,
        directLink: string,
        placeholderUrl: string,
        isDefaultAsias: boolean,
        settings?: AliasProperties['settings']
    ): Promise<void> {
        if (!this.searchEngines.alias[name]) return;

	this.searchEngines.alias[name].placeholderUrl = placeholderUrl || null;
	this.searchEngines.alias[name].url = directLink || null;
        this.searchEngines.alias[name].settings = settings;
        const aliasType = this.getAliasType(placeholderUrl);
        this.searchEngines.alias[name].type = aliasType;
        this.handleUpdateDefaultAlias(isDefaultAsias, name);

        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });
    }

    async deleteAlias(name: string): Promise<void> {
        this.searchEngines.alias = Object.fromEntries(
            Object.entries(this.searchEngines.alias).filter(([key]) => key !== name)
        );
        this.handleUpdateDefaultAlias(false, name);

        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });
    }

    async clearAllAliases(): Promise<void> {
        await browser.storage.sync.clear();
        this.searchEngines.alias = {};
    }

    async importAliases(fileContent: SearchEngine): Promise<void> {
        const mergedAliases = { ...this.searchEngines.alias, ...fileContent.alias };
        this.searchEngines = fileContent;
        this.searchEngines.alias = mergedAliases;
        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });
    }

    exportAliases(): string {
        return JSON.stringify(this.searchEngines);
    }

    hasAliases(): boolean {
        return Boolean(this.searchEngines?.alias && Object.keys(this.searchEngines.alias).length);
    }

    private getAliasType(url: string) {
        return url.includes("%s") ? "placeholder" : "link";
    }

    private handleUpdateDefaultAlias(isDefaultAlias: boolean, currentAliasName: string) {
        const idxOf = getIndexOfExactMatch(currentAliasName, this.searchEngines.defaultAlias);

        if (idxOf !== null) {
            this.searchEngines.defaultAlias = this.searchEngines.defaultAlias.slice(0, idxOf);
            if (!isDefaultAlias) return;
        }

        if (isDefaultAlias && idxOf === null) {
            this.searchEngines.defaultAlias ? this.searchEngines.defaultAlias += `${currentAliasName} ` : this.searchEngines.defaultAlias = `${currentAliasName} `;
        }
    }
}
