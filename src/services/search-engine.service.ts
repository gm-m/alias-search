import browser from "webextension-polyfill";
import { AliasProperties, SearchEngine } from "./types";
import { getDefaultSearchEngines } from "../utility";

export class SearchEngineService {
    private searchEngines: SearchEngine = getDefaultSearchEngines();

    async loadSavedData(): Promise<SearchEngine> {
        const result = await browser.storage.sync.get("searchEnginesObj");
        if (result?.searchEnginesObj) {
            this.searchEngines = result.searchEnginesObj;
        }

        return this.searchEngines;
    }

    async saveSettings(settings: Omit<SearchEngine, 'alias'>): Promise<void> {
        Object.assign(this.searchEngines, settings);
        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });
    }

    async createAlias(aliasName: string, aliasUrl: string, searchEngineName: string, categories: string): Promise<AliasProperties> {
        if (!aliasName || !aliasUrl) {
            throw new Error("Fill all data");
        }

        const aliasCategories = categories ? categories.split(',').map(cat => cat.trim()) : null;
        const aliasType = this.getAliasType(aliasUrl);

        const newAlias = {
            searchEngine: searchEngineName,
            type: aliasType,
            categories: aliasCategories
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

    async updateAlias(name: string, url: string): Promise<void> {
        if (!this.searchEngines.alias[name]) return;

        const aliasType = this.getAliasType(url);
        this.searchEngines.alias[name].url = url;
        this.searchEngines.alias[name].type = aliasType;

        await browser.storage.sync.set({ "searchEnginesObj": this.searchEngines });
    }

    async deleteAlias(name: string): Promise<void> {
        this.searchEngines.alias = Object.fromEntries(
            Object.entries(this.searchEngines.alias).filter(([key]) => key !== name)
        );
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
}