export type SearchEngine = {
    alias: Alias;
    enableMultiAlias: boolean;
    defaultAlias: string;
    incognitoMode: boolean;
    openAsUrl: boolean;
    prefillUrl: boolean;
    targetWindow: "_blank" | "_self";
};

export type AliasProperties = {
    categories: string[] | null;
    type: "placeholder" | "link" | "multi";
    searchEngine: string;
    placeholderUrl: string | null;
    url: string;
};

export type Alias = {
    [key: string]: AliasProperties;
};

export type ActiveAlias = { "name": string; defaultAlias: SearchEngine['defaultAlias']; } & AliasProperties;

export interface SearchPayload {
    aliases: ParsedAlias[];
    aliasDescriptions: string[];
    searchQuery: string;
    categories: string[];
}

export interface TabOptions {
    incognito: boolean;
    newTab: boolean;
}

export interface ParsedAlias extends TabOptions {
    alias: string;
}

export interface UrlWithOptions extends TabOptions {
    url: string;
}

export interface CurrentTabUrl {
    url: string;
}

export interface PopupElements {
    container: HTMLDivElement;
    userInput: HTMLInputElement;
    activeAlias: HTMLSpanElement;
}