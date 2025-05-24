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

        // Base settings from alias or global defaults
        const baseIncognito = aliasProps?.settings?.incognitoMode ?? searchEngines.incognitoMode;
        const baseNewTab = (aliasProps?.settings?.newTab === true) || (searchEngines.targetWindow === '_blank');

        // Command-line overrides
        const commandSettings = this.extractCommandSettings(word);

        return {
            // Initial incognito value: command override or base. Regex logic will be applied later in handleSearch.
            incognito: commandSettings.incognito ?? baseIncognito,
            newTab: commandSettings.newTab ?? baseNewTab,
            commandLineIncognito: commandSettings.incognito // Captures explicit '!', '!!', or undefined
        };
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

        // Base settings from category-specific settings or global defaults
        const baseIncognito = categorySettings?.incognitoMode ?? searchEngines.incognitoMode;
        const baseNewTab = (categorySettings?.newTab === true) || (searchEngines.targetWindow === '_blank');

        // Command-line overrides (if 'word' for category contains '!' or '!!')
        const commandSettings = this.extractCommandSettings(word);

        return {
            // Initial incognito value: command override or base. Regex logic will be applied later in handleSearch.
            incognito: commandSettings.incognito ?? baseIncognito,
            newTab: commandSettings.newTab ?? baseNewTab,
            commandLineIncognito: commandSettings.incognito // Captures explicit '!', '!!', or undefined
        };
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
        if (alias.type === "link") {
            // A 'link' type alias should always have a URL.
            return alias.url!; 
        }
        // If there's no search query and the alias is not a placeholder type (i.e., it's a 'link' or 'multi'),
        // it should navigate to its base URL.
        if (!searchQuery && alias.type !== "placeholder") {
            return alias.url!;
        }

        // For placeholder types, or any type when a search query is present and previous conditions didn't match.
        return alias.placeholderUrl!.replace('%s', encodeURIComponent(searchQuery));
    }

    handleSearch(searchQuery: string): void {
        const { aliases: parsedAliases, searchQuery: query, categories: parsedCategories } = this.state.getCachedPayload();
        const searchEngines = this.state.getSearchEngines();

        // Intermediate structure to hold URL info before final decision
        interface IntermediateUrlInfo {
            url: string;
            newTab: boolean;
            initialIncognito: boolean; // Incognito value from getTabOptions (pre-regex)
            commandLineIncognito?: boolean; // From getTabOptions (true for '!', false for '!!', undefined otherwise)
        }
        const intermediateUrlInfos: IntermediateUrlInfo[] = [];

        // Process direct aliases
        parsedAliases.forEach(parsedAlias => {
            const aliasDetails = searchEngines.alias[parsedAlias.alias];
            // Ensure aliasDetails exists and handle placeholder logic
            if (!aliasDetails || (aliasDetails.type === "placeholder" && !query)) return;
            
            intermediateUrlInfos.push({
                url: this.getTargetUrl(aliasDetails, query),
                newTab: parsedAlias.newTab,
                initialIncognito: parsedAlias.incognito, // This is the incognito value from getTabOptions
                commandLineIncognito: parsedAlias.commandLineIncognito
            });
        });

        // Process categories
        if (parsedCategories.length) {
            Object.values(searchEngines.alias)
                .filter(aliasDetails => aliasDetails.categories?.some(categoryName => parsedCategories.some(pc => pc.category === categoryName)))
                .forEach(aliasDetails => {
                    // Find the specific ParsedCategory object that led to this alias being included
                    // This is important to get the correct commandLineIncognito if categories had prefixes
                    const matchingParsedCategory = parsedCategories.find(pc => aliasDetails.categories!.includes(pc.category));
                    if (!matchingParsedCategory) return; // Should not happen if filter is correct

                    // Ensure aliasDetails exists and handle placeholder logic
                    if (aliasDetails.type === "placeholder" && !query) return;

                    intermediateUrlInfos.push({
                        url: this.getTargetUrl(aliasDetails, query),
                        newTab: matchingParsedCategory.newTab, // Use newTab from the parsed category rule
                        initialIncognito: matchingParsedCategory.incognito, // Use incognito from the parsed category rule
                        commandLineIncognito: matchingParsedCategory.commandLineIncognito
                    });
                });
        }

        // Handle URL-only case
        // For URL-only, commandLineIncognito will be undefined as no '!' or '!!' applies directly to it.
        if (intermediateUrlInfos.length === 0 && searchEngines.openAsUrl && searchQuery) {
            const urlInput = searchQuery.match(/^https?:\/\//i) ? searchQuery : `https://${searchQuery}`;
            intermediateUrlInfos.push({
                url: urlInput,
                newTab: searchEngines.targetWindow === '_blank',
                initialIncognito: searchEngines.incognitoMode, // Global default incognito
                commandLineIncognito: undefined 
            });
        }

        // Determine if global incognito regex matches
        let globalRegexMatches = false;
        const globalIncognitoRegexPattern = searchEngines.incognitoRegex;
        if (globalIncognitoRegexPattern && query) { 
            try {
                const regex = new RegExp(globalIncognitoRegexPattern);
                if (regex.test(query)) {
                    globalRegexMatches = true;
                }
            } catch (e) {
                console.error("Invalid incognito regex pattern in settings:", globalIncognitoRegexPattern, e);
            }
        }

        const finalUrlsToOpen = new Set<UrlWithOptions>();

        for (const item of intermediateUrlInfos) {
            let determinedIncognito = item.initialIncognito; // Start with the pre-regex value

            // Apply priority logic
            if (item.commandLineIncognito === false) { // Priority 1: '!!' (Force non-incognito)
                determinedIncognito = false;
            } else if (item.commandLineIncognito === true) { // Priority 2: '!' (Force incognito)
                determinedIncognito = true;
            } else { // No '!' or '!!' for this item (commandLineIncognito is undefined)
                if (globalRegexMatches) { // Priority 3: Global Regex Match
                    determinedIncognito = true;
                }
                // Else, determinedIncognito remains item.initialIncognito (Priorities 4, 5, 6)
            }
            
            finalUrlsToOpen.add({
                url: item.url,
                incognito: determinedIncognito,
                newTab: item.newTab
            });
        }

        if (finalUrlsToOpen.size) {
            browser.runtime.sendMessage({
                action: "openTabs",
                urls: Array.from(finalUrlsToOpen)
            });
        }
    }
}
