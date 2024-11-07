import browser from "webextension-polyfill";
import { getDefaultSearchEngines } from "../utility";
import { SearchEngine, SearchPayload } from "./types";

export class SearchState {
    private searchEngines: SearchEngine;
    private cachedSearchPayload: SearchPayload;

    constructor() {
        this.searchEngines = getDefaultSearchEngines();
        this.cachedSearchPayload = {
            aliases: [],
            aliasDescriptions: [],
            searchQuery: '',
            categories: []
        };
    }

    async loadSearchEngines(): Promise<void> {
        const result = await browser.storage.sync.get("searchEnginesObj");
        if (result?.searchEnginesObj) {
            this.searchEngines = result.searchEnginesObj;
        }
    }

    getSearchEngines(): SearchEngine {
        return this.searchEngines;
    }

    getCachedPayload(): SearchPayload {
        return this.cachedSearchPayload;
    }

    setCachedPayload(payload: SearchPayload): void {
        this.cachedSearchPayload = payload;
    }
}
