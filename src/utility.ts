import { SearchEngine } from "./services/types";

export const getDefaultSearchEngines = (): SearchEngine => {
    return {
        alias: {},
        targetWindow: '_blank',
        openAsUrl: true,
        incognitoMode: false,
        enableMultiAlias: false,
        prefillUrl: false
    };
};