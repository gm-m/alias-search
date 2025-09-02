import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchHandler } from './search-handler';
import { SearchState } from './search-state';
import { SearchEngine, SearchPayload } from './types';
import browser from 'webextension-polyfill';

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
  let mockSearchEngines: SearchEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    searchState = new SearchState();
    
    // Add setCachedPayload method if it doesn't exist
    if (!searchState.setCachedPayload) {
      searchState.setCachedPayload = vi.fn((payload: SearchPayload) => {
        (searchState as any).cachedPayload = payload;
      });
    }
    
    searchHandler = new SearchHandler(searchState);

    // Common mock search engines setup
    mockSearchEngines = {
      alias: {
        'g': {
          searchEngine: 'Google',
          type: 'placeholder',
          placeholderUrl: 'https://google.com/search?q=%s',
          categories: null,
          url: 'https://google.com'
        },
        'y': {
          searchEngine: 'YouTube',
          type: 'placeholder',
          placeholderUrl: 'https://youtube.com/results?search_query=%s',
          categories: null,
          url: 'https://youtube.com'
        },
        'gh': {
          searchEngine: 'GitHub',
          type: 'placeholder',
          placeholderUrl: 'https://github.com/search?q=%s',
          categories: ['dev'],
          url: 'https://github.com'
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
  });

  // =====================================================
  // CORE FUNCTIONALITY TESTS
  // =====================================================
  describe('parseAliases - Core Functionality', () => {
    it('should parse single alias correctly', () => {
      const result = searchHandler.parseAliases('g test query');
      expect(result).toEqual({
        aliases: [{ alias: 'g', incognito: false, newTab: true, commandLineIncognito: undefined }],
        aliasDescriptions: ['Google'],
        searchQuery: 'test query',
        categories: []
      });
    });

    it('should handle multiple aliases when enabled', () => {
      const result = searchHandler.parseAliases('g y test query');
      expect(result.aliases).toHaveLength(2);
      expect(result.aliasDescriptions).toContain('Google');
      expect(result.aliasDescriptions).toContain('YouTube');
    });

    it('should handle category-based aliases', () => {
      const result = searchHandler.parseAliases('dev test query');
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]).toEqual({
        category: 'dev',
        incognito: false,
        newTab: true,
        commandLineIncognito: undefined
      });
      expect(result.aliasDescriptions).toContain('dev (Category)');
    });
  });

  // =====================================================
  // COMMAND MODIFIERS TESTS
  // =====================================================
  describe('parseAliases - Command Modifiers', () => {
    it('should handle incognito modifier (!)', () => {
      const result = searchHandler.parseAliases('!g test query');
      expect(result.aliases[0]).toEqual({
        alias: 'g',
        incognito: true,
        newTab: true,
        commandLineIncognito: true
      });
    });

    it('should handle double incognito modifier (!!)', () => {
      const result = searchHandler.parseAliases('!!g test query');
      expect(result.aliases[0]).toEqual({
        alias: 'g',
        incognito: false,
        newTab: true,
        commandLineIncognito: false
      });
    });

    it('should handle new tab modifier (@)', () => {
      mockSearchEngines.targetWindow = '_self'; // Change default to test override
      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);

      const result = searchHandler.parseAliases('@g test query');
      expect(result.aliases[0]).toEqual({
        alias: 'g',
        incognito: false,
        newTab: true,
        commandLineIncognito: undefined
      });
    });

    it('should handle combined modifiers (!@)', () => {
      const result = searchHandler.parseAliases('!@g test query');
      expect(result.aliases[0]).toEqual({
        alias: 'g',
        incognito: true,
        newTab: true,
        commandLineIncognito: true
      });
    });

    it('should apply modifiers to categories', () => {
      const result = searchHandler.parseAliases('!dev test query');
      expect(result.categories[0]).toEqual({
        category: 'dev',
        incognito: true,
        newTab: true,
        commandLineIncognito: true
      });
    });
  });

  // =====================================================
  // PER-ALIAS SETTINGS TESTS
  // =====================================================
  describe('parseAliases - Per-Alias Settings', () => {
    beforeEach(() => {
      mockSearchEngines.alias['g'].settings = {
        incognitoMode: true,
        newTab: false
      };
      // Change global setting to _self to test per-alias override
      mockSearchEngines.targetWindow = '_self';
      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);
    });

    it('should respect per-alias settings', () => {
      const result = searchHandler.parseAliases('g test query');
      expect(result.aliases[0]).toEqual({
        alias: 'g',
        incognito: true,  // From per-alias settings
        newTab: false,    // From per-alias settings
        commandLineIncognito: undefined
      });
    });

    it('should allow command-line options to override per-alias settings', () => {
      const result = searchHandler.parseAliases('!!@g test query');
      expect(result.aliases[0]).toEqual({
        alias: 'g',
        incognito: false, // Overridden by !!
        newTab: true,     // Overridden by @
        commandLineIncognito: false
      });
    });
  });

  // =====================================================
  // MULTI-QUERY FEATURE TESTS
  // =====================================================
  describe('Multi-Query Syntax', () => {
    describe('parseMultiQuery - Internal Method', () => {
      it('should detect and parse basic multi-query syntax', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('g[javascript..python..react]');
        expect(result).toEqual([
          'g javascript',
          'g python',
          'g react'
        ]);
      });

      it('should handle single query without brackets (no change)', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('g javascript tutorial');
        expect(result).toEqual(['g javascript tutorial']);
      });

      it('should handle modifiers with multi-query syntax', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('!@g[secure search..private query]');
        expect(result).toEqual([
          '!@g secure search',
          '!@g private query'
        ]);
      });

      it('should handle additional text after brackets', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('g[react..vue] tutorial 2024');
        expect(result).toEqual([
          'g react tutorial 2024',
          'g vue tutorial 2024'
        ]);
      });

      it('should filter out empty queries', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('g[javascript....react]');
        expect(result).toEqual([
          'g javascript',
          'g react'
        ]);
      });

      it('should handle multiple bracket expressions', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('g[react] y[tutorial]');
        expect(result).toEqual([
          'g react',
          'y tutorial'
        ]);
      });

      it('should handle multiple bracket expressions with multi-queries', () => {
        const parseMultiQuery = (searchHandler as any).parseMultiQuery.bind(searchHandler);
        
        const result = parseMultiQuery('g[react..vue] y[tutorial..guide]');
        expect(result).toEqual([
          'g react',
          'g vue',
          'y tutorial',
          'y guide'
        ]);
      });
    });

    describe('handleSearch - Multi-Query Integration', () => {
      beforeEach(() => {
        // Set up default cached payload
        vi.spyOn(searchState, 'getCachedPayload').mockReturnValue({
          aliases: [],
          aliasDescriptions: [],
          searchQuery: '',
          categories: []
        });
      });

      it('should handle multi-query search and open multiple tabs', () => {
        // Mock processSingleSearch to return specific URLs
        vi.spyOn(searchHandler as any, 'processSingleSearch').mockImplementation((query: string) => {
          if (query.includes('javascript')) {
            return [{
              url: 'https://google.com/search?q=javascript',
              incognito: false,
              newTab: true
            }];
          }
          if (query.includes('python')) {
            return [{
              url: 'https://google.com/search?q=python',
              incognito: false,
              newTab: true
            }];
          }
          return [];
        });

        searchHandler.handleSearch('g[javascript..python]');

        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
          action: 'openTabs',
          urls: [
            { url: 'https://google.com/search?q=javascript', incognito: false, newTab: true },
            { url: 'https://google.com/search?q=python', incognito: false, newTab: true }
          ]
        });
      });

      it('should remove duplicate URLs from multi-query results', () => {
        vi.spyOn(searchHandler as any, 'processSingleSearch').mockReturnValue([{
          url: 'https://google.com/search?q=duplicate',
          incognito: false,
          newTab: true
        }]);

        searchHandler.handleSearch('g[query1..query2]');

        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
          action: 'openTabs',
          urls: [
            { url: 'https://google.com/search?q=duplicate', incognito: false, newTab: true }
          ]
        });
      });

      it('should handle empty results gracefully', () => {
        vi.spyOn(searchHandler as any, 'processSingleSearch').mockReturnValue([]);

        searchHandler.handleSearch('g[nonexistent..invalid]');

        expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
      });

      it('should fall back to original behavior for single queries', () => {
        vi.spyOn(searchState, 'getCachedPayload').mockReturnValue({
          aliases: [{ alias: 'g', incognito: false, newTab: true, commandLineIncognito: undefined }],
          aliasDescriptions: ['Google'],
          searchQuery: 'javascript',
          categories: []
        });

        searchHandler.handleSearch('g javascript');

        expect(browser.runtime.sendMessage).toHaveBeenCalledOnce();
      });
    });
  });

  // =====================================================
  // SEARCH EXECUTION TESTS
  // =====================================================
  describe('handleSearch - Search Execution', () => {
    beforeEach(() => {
      vi.spyOn(searchState, 'getCachedPayload').mockReturnValue({
        aliases: [{ alias: 'g', incognito: false, newTab: true, commandLineIncognito: undefined }],
        aliasDescriptions: ['Google'],
        searchQuery: 'test query',
        categories: []
      });
    });

    it('should execute basic alias search', () => {
      searchHandler.handleSearch('g test query');

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'openTabs',
        urls: [{
          url: 'https://google.com/search?q=test%20query',
          incognito: false,
          newTab: true
        }]
      });
    });

    it('should handle incognito regex matches', () => {
      mockSearchEngines.incognitoRegex = 'password|secure';
      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);
      vi.spyOn(searchState, 'getCachedPayload').mockReturnValue({
        aliases: [{ alias: 'g', incognito: false, newTab: true, commandLineIncognito: undefined }],
        aliasDescriptions: ['Google'],
        searchQuery: 'password manager',
        categories: []
      });

      searchHandler.handleSearch('g password manager');

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'openTabs',
        urls: [{
          url: 'https://google.com/search?q=password%20manager',
          incognito: true, // Should be true due to regex match
          newTab: true
        }]
      });
    });

    it('should prioritize command-line incognito over regex', () => {
      mockSearchEngines.incognitoRegex = 'password';
      vi.spyOn(searchState, 'getSearchEngines').mockReturnValue(mockSearchEngines);
      vi.spyOn(searchState, 'getCachedPayload').mockReturnValue({
        aliases: [{ alias: 'g', incognito: false, newTab: true, commandLineIncognito: false }],
        aliasDescriptions: ['Google'],
        searchQuery: 'password manager',
        categories: []
      });

      searchHandler.handleSearch('!!g password manager');

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'openTabs',
        urls: [{
          url: 'https://google.com/search?q=password%20manager',
          incognito: false, // Should be false due to !! override
          newTab: true
        }]
      });
    });
  });

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================
  describe('Integration Tests', () => {
    it('should handle complex multi-query with different aliases and modifiers', () => {
      const mockSendMessage = vi.spyOn(browser.runtime, 'sendMessage');
      
      // Mock the individual search results for multiple bracket expressions
      vi.spyOn(searchHandler as any, 'processSingleSearch').mockImplementation((query: string) => {
        if (query === '!g react') {
          return [{
            url: 'https://google.com/search?q=react',
            incognito: true,
            newTab: true
          }];
        }
        if (query === 'y tutorial') {
          return [{
            url: 'https://youtube.com/results?search_query=tutorial',
            incognito: false,
            newTab: true
          }];
        }
        return [];
      });

      // Use multiple bracket expressions
      searchHandler.handleSearch('!g[react] y[tutorial]');

      expect(mockSendMessage).toHaveBeenCalledWith({
        action: 'openTabs',
        urls: expect.arrayContaining([
          expect.objectContaining({
            url: 'https://google.com/search?q=react',
            incognito: true
          }),
          expect.objectContaining({
            url: 'https://youtube.com/results?search_query=tutorial',
            incognito: false
          })
        ])
      });
    });

    it('should maintain backward compatibility with existing syntax', () => {
      vi.spyOn(searchState, 'getCachedPayload').mockReturnValue({
        aliases: [
          { alias: 'g', incognito: false, newTab: true, commandLineIncognito: undefined },
          { alias: 'y', incognito: false, newTab: true, commandLineIncognito: undefined }
        ],
        aliasDescriptions: ['Google', 'YouTube'],
        searchQuery: 'react tutorial',
        categories: []
      });

      // Traditional multi-alias syntax should still work
      searchHandler.handleSearch('g y react tutorial');

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'openTabs',
        urls: expect.arrayContaining([
          expect.objectContaining({
            url: 'https://google.com/search?q=react%20tutorial'
          }),
          expect.objectContaining({
            url: 'https://youtube.com/results?search_query=react%20tutorial'
          })
        ])
      });
    });
  });
});