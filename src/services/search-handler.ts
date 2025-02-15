import browser from "webextension-polyfill";
import { SearchState } from "./search-state";
import { AliasProperties, ParsedAlias, ParsedCategory, SearchPayload, TabOptions, UrlWithOptions } from "./types";

const SETTINGS_MAP: Record<string, keyof TabOptions> = {
    '!': 'incognito',
    '@': 'newTab'
};

export class SearchHandler {
    constructor(private state: SearchState) { }

    private getTabOptions(word: string): TabOptions {
        const settings: TabOptions = {
            incognito: this.state.getSearchEngines().incognitoMode,
            newTab: this.state.getSearchEngines().targetWindow === '_blank'
        };

        for (const [index, char] of [...word].entries()) {
            const settingKey = SETTINGS_MAP[char];
            // Sets the property to true if the following character is different, and false if it is the same.
            if (settingKey) settings[settingKey] = word[index + 1] !== char;
        }

        return settings;
    }

    parseAliases(inputText: string): SearchPayload {
        const words = inputText.trim().split(' ').filter(Boolean);
        const aliases: ParsedAlias[] = [];
        const aliasDescriptions = new Set<string>();
        const categories: ParsedCategory[] = [];
        const searchEngines = this.state.getSearchEngines();

        let searchQuery = '';

        for (const word of words) {
            const tabOptions = this.getTabOptions(word);
            const cleanWord = word.replace(/^[!@]+/, '');

            const alias = searchEngines.alias[cleanWord];
            if (alias) {
                if (!searchEngines.enableMultiAlias && aliases.length) {
                    searchQuery = words.slice(words.indexOf(word)).join(' ');
                    break;
                }

                aliases.push({ alias: cleanWord, ...tabOptions });
                aliasDescriptions.add(alias.searchEngine);
                continue;
            }

            // Check categories
            const matchingCategories = Object.values(searchEngines.alias)
                .filter(a => a.categories?.includes(cleanWord))
                .length > 0 ? [{ category: cleanWord, ...tabOptions }] : [];

            if (matchingCategories.length) {
                categories.push(...matchingCategories);
                aliasDescriptions.add(`${cleanWord} (Category)`);
                continue;
            }

            searchQuery = words.slice(words.indexOf(word)).join(' ');
            break;
        }

        return { aliases, aliasDescriptions: Array.from(aliasDescriptions), searchQuery, categories };
    }

    private getTargetUrl(alias: AliasProperties, searchQuery: string): string {
        if (alias.type === "link") return alias.url;
        if (!searchQuery && alias.type !== "placeholder") return alias.url;

        return alias.placeholderUrl!.replace('%s', encodeURIComponent(searchQuery));
    }

    handleSearch(searchQuery: string): void {
        const { aliases, searchQuery: query, categories } = this.state.getCachedPayload();
        const searchEngines = this.state.getSearchEngines();

        const urls = new Set<UrlWithOptions>();

        // Handle aliases and categories
        const defaultTabOptions = {
            incognito: searchEngines.incognitoMode,
            newTab: searchEngines.targetWindow === '_blank'
        };

        // Process direct aliases
        aliases.forEach(({ alias: aliasName, ...tabOptions }) => {
            const alias = searchEngines.alias[aliasName];
            if (alias.type === "placeholder" && !query) return;
            urls.add({ url: this.getTargetUrl(alias, query), ...tabOptions });
        });

        // Process categories
        if (categories.length) {
            Object.values(searchEngines.alias)
                .filter(alias => alias.categories?.some(category => categories.some(c => c.category === category)))
                .forEach(alias => {
                    const matchingCategory = categories.find(c => alias.categories!.includes(c.category))!;
                    urls.add({
                        url: this.getTargetUrl(alias, query),
                        incognito: matchingCategory.incognito,
                        newTab: matchingCategory.newTab
                    });
                });
        }

        // Handle URL-only case
        if (urls.size === 0 && searchEngines.openAsUrl) {
            urls.add({
                url: searchQuery.match(/^https?:\/\//i) ? searchQuery : `https://${searchQuery}`,
                ...defaultTabOptions
            });
        }

        if (urls.size) {
            browser.runtime.sendMessage({
                action: "openTabs",
                urls: Array.from(urls)
            });
        }
    }
}
