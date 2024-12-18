import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchHandler } from './search-handler';
import { SearchState } from './search-state';
import { SearchEngine } from './types';

// Mock browser API
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      sync: {
        get: vi.fn(),
        set: vi.fn(),
      }
    },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn()
      }
    }
  }
}));

describe('SearchHandler', () => {
  let searchHandler: SearchHandler;
  let searchState: SearchState;

  beforeEach(() => {
    searchState = new SearchState();
    searchHandler = new SearchHandler(searchState);
  });

  describe('parseAliases', () => {
    it('should parse single alias correctly', () => {
      const mockSearchEngines: SearchEngine = {
        alias: {
          'g': {
            searchEngine: 'Google',
            type: 'placeholder',
            placeholderUrl: 'https://google.com/search?q=%s',
            categories: null,
            url: ''
          }
        },
        enableMultiAlias: true,
        defaultAlias: '',
        incognitoMode: false,
        openAsUrl: true,
        prefillUrl: false,
        targetWindow: '_blank'
      };

      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);

      const result = searchHandler.parseAliases('g test query');
      expect(result).toEqual({
        aliases: [{ alias: 'g', incognito: false, newTab: true }],
        aliasDescriptions: ['Google'],
        searchQuery: 'test query',
        categories: []
      });
    });

    it('should handle multiple aliases when enabled', () => {
      const mockSearchEngines: SearchEngine = {
        alias: {
          'g': {
            searchEngine: 'Google',
            type: 'placeholder',
            categories: null,
            placeholderUrl: "https://www.google.it/search?q=%s",
            url: ''
          },
          'y': {
            searchEngine: "Youtube",
            type: "placeholder",
            categories: null,
            placeholderUrl: "https://www.youtube.com/results?search_query=%s",
            url: ''
          }
        },
        enableMultiAlias: true,
        defaultAlias: '',
        incognitoMode: false,
        openAsUrl: true,
        prefillUrl: false,
        targetWindow: '_blank'
      };

      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);

      const result = searchHandler.parseAliases('g y test query');
      expect(result.aliases).toHaveLength(2);
      expect(result.aliasDescriptions).toContain('Google');
      expect(result.aliasDescriptions).toContain('Youtube');
    });

    it('should handle category-based aliases', () => {
      const mockSearchEngines: SearchEngine = {
        alias: {
          'g': {
            searchEngine: 'Google',
            type: 'placeholder',
            placeholderUrl: 'https://google.com/search?q=%s',
            categories: ['search'],
            url: ''
          }
        },
        enableMultiAlias: true,
        incognitoMode: false,
        defaultAlias: '',
        openAsUrl: true,
        prefillUrl: false,
        targetWindow: '_blank'
      };

      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);

      const result = searchHandler.parseAliases('search test query');
      expect(result.categories).toContain('search');
      expect(result.aliasDescriptions).toContain('search (Category)');
    });
  });
});
