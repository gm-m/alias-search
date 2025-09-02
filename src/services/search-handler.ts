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

    /**
     * Parses multi-query syntax like g[keyword1..keyword2] or multiple expressions like g[react] y[tutorial]
     * Returns an array of individual queries to process
     */
    private parseMultiQuery(inputText: string): string[] {
        // Check for multiple bracket expressions: g[react] y[tutorial]
        const multipleBracketRegex = /([!@]*\w+)\[([^\]]+)\]/g;
        const matches = Array.from(inputText.matchAll(multipleBracketRegex));
        
        if (matches.length > 1) {
            // Handle multiple bracket expressions
            const allQueries: string[] = [];
            for (const match of matches) {
                const [, aliasWithModifiers, queriesString] = match;
                const queries = queriesString.split('..').map(q => q.trim()).filter(Boolean);
                queries.forEach(query => {
                    allQueries.push(`${aliasWithModifiers} ${query}`);
                });
            }
            return allQueries;
        }
        
        // Handle single bracket expression: g[keyword1..keyword2] optional_text
        const singleBracketRegex = /^([!@]*\w+)\[([^\]]+)\](.*)$/;
        const singleMatch = inputText.match(singleBracketRegex);
        
        if (!singleMatch) {
            return [inputText]; // No multi-query syntax found, return original
        }

        const [, aliasWithModifiers, queriesString, remainingText] = singleMatch;
        const queries = queriesString.split('..').map(q => q.trim()).filter(Boolean);
        
        // Generate individual search strings
        return queries.map(query => {
            const parts = [aliasWithModifiers, query];
            if (remainingText.trim()) {
                parts.push(remainingText.trim());
            }
            return parts.join(' ');
        });
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

    /**
     * Processes a single search command and returns the URLs to open
     */
    private processSingleSearch(inputText: string): UrlWithOptions[] {
        // Cache the current payload and temporarily parse this specific input
        const originalPayload = this.state.getCachedPayload();
        
        // Parse this specific input
        const payload = this.parseAliases(inputText);
        
        // Temporarily set the payload for processing
        this.state.setCachedPayload(payload);
        
        const { aliases: parsedAliases, searchQuery: query, categories: parsedCategories } = payload;
        const searchEngines = this.state.getSearchEngines();

        // Intermediate structure to hold URL info before final decision
        interface IntermediateUrlInfo {
            url: string;
            newTab: boolean;
            initialIncognito: boolean;
            commandLineIncognito?: boolean;
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
                initialIncognito: parsedAlias.incognito,
                commandLineIncognito: parsedAlias.commandLineIncognito
            });
        });

        // Process categories
        if (parsedCategories.length) {
            Object.values(searchEngines.alias)
                .filter(aliasDetails => aliasDetails.categories?.some(categoryName => parsedCategories.some(pc => pc.category === categoryName)))
                .forEach(aliasDetails => {
                    const matchingParsedCategory = parsedCategories.find(pc => aliasDetails.categories!.includes(pc.category));
                    if (!matchingParsedCategory) return;

                    if (aliasDetails.type === "placeholder" && !query) return;

                    intermediateUrlInfos.push({
                        url: this.getTargetUrl(aliasDetails, query),
                        newTab: matchingParsedCategory.newTab,
                        initialIncognito: matchingParsedCategory.incognito,
                        commandLineIncognito: matchingParsedCategory.commandLineIncognito
                    });
                });
        }

        // Handle URL-only case
        if (intermediateUrlInfos.length === 0 && searchEngines.openAsUrl && inputText) {
            const urlInput = inputText.match(/^https?:\/\//i) ? inputText : `https://${inputText}`;
            intermediateUrlInfos.push({
                url: urlInput,
                newTab: searchEngines.targetWindow === '_blank',
                initialIncognito: searchEngines.incognitoMode,
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

        const urlsToOpen: UrlWithOptions[] = [];

        for (const item of intermediateUrlInfos) {
            let determinedIncognito = item.initialIncognito;

            // Apply priority logic
            if (item.commandLineIncognito === false) {
                determinedIncognito = false;
            } else if (item.commandLineIncognito === true) {
                determinedIncognito = true;
            } else {
                if (globalRegexMatches) {
                    determinedIncognito = true;
                }
            }
            
            urlsToOpen.push({
                url: item.url,
                incognito: determinedIncognito,
                newTab: item.newTab
            });
        }

        // Restore original payload
        this.state.setCachedPayload(originalPayload);
        
        return urlsToOpen;
    }

    handleSearch(searchQuery: string): void {
        // Parse multi-query syntax
        const individualQueries = this.parseMultiQuery(searchQuery);
        
        // If only one query (no multi-query syntax), use original logic
        if (individualQueries.length === 1) {
            const { aliases: parsedAliases, searchQuery: query, categories: parsedCategories } = this.state.getCachedPayload();
            const searchEngines = this.state.getSearchEngines();

            // ... (original handleSearch logic for single query)
            interface IntermediateUrlInfo {
                url: string;
                newTab: boolean;
                initialIncognito: boolean;
                commandLineIncognito?: boolean;
            }
            const intermediateUrlInfos: IntermediateUrlInfo[] = [];

            // Process direct aliases
            parsedAliases.forEach(parsedAlias => {
                const aliasDetails = searchEngines.alias[parsedAlias.alias];
                if (!aliasDetails || (aliasDetails.type === "placeholder" && !query)) return;
                
                intermediateUrlInfos.push({
                    url: this.getTargetUrl(aliasDetails, query),
                    newTab: parsedAlias.newTab,
                    initialIncognito: parsedAlias.incognito,
                    commandLineIncognito: parsedAlias.commandLineIncognito
                });
            });

            // Process categories
            if (parsedCategories.length) {
                Object.values(searchEngines.alias)
                    .filter(aliasDetails => aliasDetails.categories?.some(categoryName => parsedCategories.some(pc => pc.category === categoryName)))
                    .forEach(aliasDetails => {
                        const matchingParsedCategory = parsedCategories.find(pc => aliasDetails.categories!.includes(pc.category));
                        if (!matchingParsedCategory) return;

                        if (aliasDetails.type === "placeholder" && !query) return;

                        intermediateUrlInfos.push({
                            url: this.getTargetUrl(aliasDetails, query),
                            newTab: matchingParsedCategory.newTab,
                            initialIncognito: matchingParsedCategory.incognito,
                            commandLineIncognito: matchingParsedCategory.commandLineIncognito
                        });
                    });
            }

            // Handle URL-only case
            if (intermediateUrlInfos.length === 0 && searchEngines.openAsUrl && searchQuery) {
                const urlInput = searchQuery.match(/^https?:\/\//i) ? searchQuery : `https://${searchQuery}`;
                intermediateUrlInfos.push({
                    url: urlInput,
                    newTab: searchEngines.targetWindow === '_blank',
                    initialIncognito: searchEngines.incognitoMode,
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
                let determinedIncognito = item.initialIncognito;

                if (item.commandLineIncognito === false) {
                    determinedIncognito = false;
                } else if (item.commandLineIncognito === true) {
                    determinedIncognito = true;
                } else {
                    if (globalRegexMatches) {
                        determinedIncognito = true;
                    }
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
            return;
        }

        // Handle multiple queries
        const allUrlsToOpen: UrlWithOptions[] = [];
        
        for (const queryText of individualQueries) {
            const urlsForQuery = this.processSingleSearch(queryText);
            allUrlsToOpen.push(...urlsForQuery);
        }

        // Remove duplicates based on URL
        const uniqueUrls = new Map<string, UrlWithOptions>();
        allUrlsToOpen.forEach(urlObj => {
            uniqueUrls.set(urlObj.url, urlObj);
        });

        if (uniqueUrls.size > 0) {
            browser.runtime.sendMessage({
                action: "openTabs",
                urls: Array.from(uniqueUrls.values())
            });
        }
    }
}
