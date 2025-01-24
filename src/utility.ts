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

// Helper function to partition array into two groups
export function partitionArray<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const truthy: T[] = [], falsy: T[] = [];
    array.forEach(item => (predicate(item) ? truthy : falsy).push(item));

    return [truthy, falsy];
}
