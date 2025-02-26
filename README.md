# Alias Search Extension

## Overview

The Alias Search Extension is a browser extension designed to enhance your web searching experience by allowing you to create and manage custom search aliases. This tool enables users to quickly access their preferred search engines and URLs using personalized shortcuts.

## Features

### Custom Alias Management

- **Add New Aliases**: Easily create new search aliases by specifying the search engine name, alias, and the corresponding URL.
- **Edit Existing Aliases**: Update the URL or other details of your existing aliases.
- **Delete Aliases**: Remove any aliases that are no longer needed.
- **Per-Alias Settings**: Configure individual settings for each alias:
  - Set an alias to always open in incognito mode, overriding global settings
  - Set an alias to always open in a new tab, overriding global settings
  - These settings can be modified directly from the Active aliases list

### Category Management

- **Organize with Categories**: Group related aliases into categories for better organization.
- **Per-Category Settings**: Configure settings for entire categories:
  - Set a category to always open in incognito mode
  - Set a category to always open in a new tab
  - These settings apply to all aliases within the category
- **Category View**: View all aliases within a category and their associated settings.
- **Inherited Settings**: See which settings are inherited from individual aliases within a category.

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
- **Default Alias**: Option to set one or more aliases as default, allowing for quick access and streamlined searches based on frequently used terms.

### Compatibility

This Extension is compatible with both Chromium-based browsers (e.g., Google Chrome, Microsoft Edge) and Firefox.

## Getting Started

### For Chromium-based Browsers (e.g., Google Chrome, Microsoft Edge)

1. Clone the repository.
2. Run `npm i && npm run build`.
3. Open your browser's extension management page (`chrome://extensions`).
4. Enable "Developer mode" (usually found in the top right corner).
5. Click on "Load unpacked" and select the folder containing the extension files.

### For Firefox

1. Clone the repository.
2. Run `npm i && npm run buildFirefox`.
3. Open your browser's extension management page by typing `about:debugging` in the address bar.
4. Click on "This Firefox" (in newer versions of Firefox) or "Load Temporary Add-on" (in older versions).
5. Select the `manifest.json` file from the folder containing the extension files.

**Note**: In Firefox, the extension will be loaded temporarily and will be removed when you restart the browser. To load the extension permanently, you will need to create a new directory for the extension and add the `manifest.json` file to it, then load the extension using the "Load Temporary Add-on" option.