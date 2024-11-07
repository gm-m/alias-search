// @ts-nocheck
import '@testing-library/dom'
import { vi } from 'vitest';

// Mock browser APIs not available in jsdom
global.HTMLElement.prototype.attachShadow = vi.fn(() => document.createElement('div'));