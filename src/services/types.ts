export type SearchEngine = {
    alias: Alias;
    enableMultiAlias: boolean;
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

export type ActiveAlias = { "name": string; } & AliasProperties;