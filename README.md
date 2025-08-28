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
- **Pattern-Based Incognito**: Define a global regular expression (regex) in the settings. If a search query (excluding the alias itself) matches this regex, the search will automatically open in incognito mode.
  - **Priority**: This regex match is evaluated as part of a specific priority order to determine the final incognito status (see "Setting Priority" below).
  - **Error Handling**: Invalid regex patterns are ignored, and an error is logged to the console.

### Custom Syntax for Overriding Global Settings

- **Override Global Settings**: Use special symbols to override global settings for individual aliases.
  - `!` before an alias to open it in incognito mode.
  - `!!` before an alias to explicitly disable incognito mode.
  - `@` before an alias to open it in a new tab.
  - `@@` before an alias to explicitly disable opening in a new tab.

### Setting Priority

The decision to apply any setting (such as incognito mode, new tab, etc.) is determined by the following priority order:

1. **Explicit Disable (`!!` or `@@`)**: If `!!` (for incognito) or `@@` (for new tab) is used before an alias (e.g., `alias!! query` or `alias@@ query`), the setting will be explicitly disabled for that item, overriding all other configurations.
2. **Explicit Enable (`!` or `@`)**: If `!` (for incognito) or `@` (for new tab) is used before an alias (e.g., `alias! query` or `alias@ query`), the setting will be explicitly enabled for that item, overriding other configurations.
3. **Global Regex Match**: If no explicit modifier is used, and a global regex is defined for a setting (e.g., `incognitoRegex`), and the search query (the part after the alias) matches this regex, the setting will be applied.
4. **Alias-Specific Setting**: If none of the above apply, the setting defined for the specific alias is used.
5. **Category-Specific Setting**: If the search is triggered via a category and none of the above apply, the category's setting is used.
6. **Global Default Setting**: Finally, if no other rule applies, the global default setting is used.

This priority order applies to all configurable settings.

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
2. Run `npm install && npm run buildFirefox`.
3. Zip all files in the build output directory (`./dist`).
4. Type `about:config` in the address bar and set `xpinstall.signatures.required` to `false`.
5. Go to the Extensions page, click the gear icon and select "Install Add-on From File...".
6. In the file picker, navigate to `./dist` and select the zip file.
