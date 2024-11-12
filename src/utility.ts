import { SearchEngine } from "./services/types";

export const getDefaultSearchEngines = (): SearchEngine => {
    return {
        alias: {},
        targetWindow: '_blank',
        openAsUrl: true,
        incognitoMode: false,
        enableMultiAlias: false,
        defaultAlias: '',
        prefillUrl: false
    };
};

export const getIndexOfExactMatch = (searchTerm: string, targetString: string): number | null => {
    const regex = new RegExp(`\\b${searchTerm}\\b`, 'i');
    const match = regex.exec(targetString);

    return match ? match.index : null;
};
