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

## Getting Started

1. Download the extension files from the repository.
2. Open your browser's extension management page (e.g., `chrome://extensions` for Chrome).
3. Enable "Developer mode" (usually found in the top right corner).
4. Click on "Load unpacked" and select the folder containing the extension files.
5. Open the extension settings to add your preferred search aliases.
6. Use the search input to quickly access your aliases while browsing.
