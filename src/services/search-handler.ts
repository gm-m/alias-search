import browser from "webextension-polyfill";
import { SearchState } from "./search-state";
import { AliasProperties, ParsedAlias, ParsedCategory, SearchPayload, TabOptions, UrlWithOptions } from "./types";

const SETTINGS_MAP: Record<string, keyof TabOptions> = {
    '!': 'incognito',
    '@': 'newTab'
};

export class SearchHandler {
    constructor(private state: SearchState) { }

    private getTabOptions(word: string, aliasProps?: AliasProperties): TabOptions {
        const searchEngines = this.state.getSearchEngines();

        // Start with the base settings from alias or global
        const baseSettings: TabOptions = {
            incognito: aliasProps?.settings?.incognitoMode ?? searchEngines.incognitoMode,
            // Only use alias-specific newTab setting when it's explicitly true, otherwise use global setting
            newTab: aliasProps?.settings?.newTab === true ? true : (searchEngines.targetWindow === '_blank')
        };

        // Override with any command-line settings from the word parameter
        const commandSettings = this.extractCommandSettings(word);

        return { ...baseSettings, ...commandSettings };
    }

    /**
     * Process the command-line options contained in the word.
     * A setting symbol is looked up in SETTINGS_MAP to find the associated key in TabOptions.
     * If the symbol is repeated (double character), the setting is disabled, otherwise enabled.
     *
     * @param word The input word containing command-line options.
     * @returns A Partial<TabOptions> with command-line overrides.
     */
    private extractCommandSettings(word: string): Partial<TabOptions> {
        const commandSettings: Partial<TabOptions> = {};
        let index = 0;

        while (index < word.length) {
            const char = word[index];
            const settingKey = SETTINGS_MAP[char];

            // If the character doesn't represent a setting key, break early
            if (!settingKey) {
                break;
            }

            // Check if next character is the same, indicating disabling the setting
            const isDouble = index + 1 < word.length && word[index + 1] === char;
            commandSettings[settingKey] = !isDouble;

            // Advance one or two characters based on whether a double was found
            index += isDouble ? 2 : 1;
        }

        return commandSettings;
    }

    private getCategoryTabOptions(word: string, category: string): TabOptions {
        const searchEngines = this.state.getSearchEngines();
        const categorySettings = searchEngines.categorySettings?.[category];

        // Start with the base settings from category settings or global
        const baseSettings: TabOptions = {
            incognito: categorySettings?.incognitoMode ?? searchEngines.incognitoMode,
            // Only use category-specific newTab setting when it's explicitly true, otherwise use global setting
            newTab: categorySettings?.newTab === true ? true : (searchEngines.targetWindow === '_blank')
        };

        // Override with any command-line settings from the word parameter
        const commandSettings = this.extractCommandSettings(word);

        return { ...baseSettings, ...commandSettings };
    }

    parseAliases(inputText: string): SearchPayload {
        const words = inputText.trim().split(' ').filter(Boolean);
        const aliases: ParsedAlias[] = [];
        const aliasDescriptions = new Set<string>();
        const categories: ParsedCategory[] = [];
        const searchEngines = this.state.getSearchEngines();

        let searchQuery = '';

        for (const word of words) {
            const cleanWord = word.replace(/^[!@]+/, '');
            const alias = searchEngines.alias[cleanWord];

            if (alias) {
                if (!searchEngines.enableMultiAlias && aliases.length) {
                    searchQuery = words.slice(words.indexOf(word)).join(' ');
                    break;
                }

                const tabOptions = this.getTabOptions(word, alias);
                aliases.push({ alias: cleanWord, ...tabOptions });
                aliasDescriptions.add(alias.searchEngine);
                continue;
            }

            // Check categories
            const matchingCategories = Object.values(searchEngines.alias)
                .filter(a => a.categories?.includes(cleanWord))
                .length > 0 ? [{ category: cleanWord, ...this.getCategoryTabOptions(word, cleanWord) }] : [];

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
                    
                    // Get category settings if they exist
                    const categorySettings = searchEngines.categorySettings?.[matchingCategory.category];
                    
                    // Apply category settings if they exist, otherwise use the settings from the parsed category
                    urls.add({
                        url: this.getTargetUrl(alias, query),
                        incognito: categorySettings?.incognitoMode ?? matchingCategory.incognito,
                        newTab: categorySettings?.newTab === true ? true : matchingCategory.newTab
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
