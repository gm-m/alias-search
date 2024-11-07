# Alias Search Extension

## Overview

The Alias Search Extension is a browser extension designed to enhance your web searching experience by allowing you to create and manage custom search aliases. This tool enables users to quickly access their preferred search engines and URLs using personalized shortcuts.

## Features

### Custom Alias Management

- **Add New Aliases**: Easily create new search aliases by specifying the search engine name, alias, and the corresponding URL.
- **Edit Existing Aliases**: Update the URL or other details of your existing aliases.
- **Delete Aliases**: Remove any aliases that are no longer needed.

### Global Settings

- **Open in New Tab**: Choose whether to open search results in a new tab or the current tab.
- **Open as URL**: Option to open the search query as a URL if no matching alias is found.
- **Incognito Mode**: Enable the option to open searches in incognito mode.
- **Multi Alias Support**: Allow multiple aliases to be triggered simultaneously.
- **Prefill Search Bar with Current Tab URL**: Option to automatically fill the search bar with the URL of the current tab.

### Custom Syntax for Overriding Global Settings

- **Override Global Settings**: Use special symbols to override global settings for individual aliases.
  - `!` before an alias to open it in incognito mode.
  - `!!` before an alias to explicitly disable incognito mode.
  - `@` before an alias to open it in a new tab.
  - `@@` before an alias to explicitly disable opening in a new tab.

### Import/Export Functionality

- **Import JSON**: Import aliases from a JSON file to quickly set up your search preferences.
- **Export JSON**: Export your current aliases to a JSON file for backup or sharing purposes.

### Search Functionality

- **Dynamic Search**: As you type in the search input, the extension dynamically suggests matching aliases and displays relevant information.
- **Category Support**: Organize aliases into categories for easier management and retrieval.

### Compatibility

This Extension is compatible with both Chromium-based browsers (e.g., Google Chrome, Microsoft Edge) and Firefox.

## Getting Started

### For Chromium-based Browsers (e.g., Google Chrome, Microsoft Edge)

1. Clone the repository.
2. Run `npm i && npm run build`.
3. Open your browser's extension management page (`chrome://extensions`).
4. Enable "Developer mode" (usually found in the top right corner).
5. Click on "Load unpacked" and select the folder containing the extension files.
6. Open the extension settings to add your preferred search aliases.
7. Press the shortcut to open the search input, then use it to quickly access your aliases while browsing.

### For Firefox

1. Clone the repository.
2. Run `npm i && npm run buildFirefox`.
3. Open your browser's extension management page by typing `about:debugging` in the address bar.
4. Click on "This Firefox" (in newer versions of Firefox) or "Load Temporary Add-on" (in older versions).
5. Select the `manifest.json` file from the folder containing the extension files.
6. Open the extension settings to add your preferred search aliases.
7. Press the shortcut to open the search input, then use it to quickly access your aliases while browsing.

Note: In Firefox, the extension will be loaded temporarily and will be removed when you restart the browser.