import { SearchEngineService } from "./services/search-engine.service";
import { SearchEngine } from "./services/types";
import { SettingsUI } from "./ui/settings";
import { DomHelpers } from "./ui/dom-helpers";

class Options {
    private searchEngineService: SearchEngineService;
    private aliasUI: SettingsUI;

    constructor() {
        this.searchEngineService = new SearchEngineService();
        this.aliasUI = new SettingsUI(this.searchEngineService);
        this.initializeEventListeners();
    }

    private async initialize(): Promise<void> {
        const searchEngines = await this.searchEngineService.loadSavedData();
        this.aliasUI.displayData(searchEngines);
    }

    private initializeEventListeners(): void {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
        document.getElementById("btn-add-new-alias")?.addEventListener("click", () => this.handleCreateNewAlias());
        document.getElementById("btn-save-settings")?.addEventListener("click", () => this.handleSaveSettings());
        document.getElementById("btn-reset")?.addEventListener("click", () => this.handleClearData());
        this.initializeImportListener();
        document.getElementById("btn-export-json")?.addEventListener("click", () => this.handleExport());
    }

    private initializeImportListener(): void {
        const importButton = document.getElementById("btn-import-json") as HTMLInputElement;
        if (importButton) {
            importButton.onchange = (event) => this.handleImport(event);
        }
    }

    private async handleCreateNewAlias(): Promise<void> {
        const urlInput = DomHelpers.getInputElement('url');
        const categoriesInput = DomHelpers.getInputElement('categories');
        const aliasInput = DomHelpers.getInputElement('alias');
        const searchEngineInput = DomHelpers.getInputElement('search-engine');

        if (!urlInput?.value || !aliasInput?.value || !searchEngineInput?.value) {
            return;
        }

        try {
            const newAlias = await this.searchEngineService.createAlias(
                aliasInput.value,
                urlInput.value,
                searchEngineInput.value,
                categoriesInput?.value || ''
            );

            if (newAlias.type === "multi") {
                this.aliasUI.updateMultiAliasCheckboxes(aliasInput.value);
            } else {
                this.aliasUI.addAliasToDom({
                    ...newAlias,
                    name: aliasInput.value
                });
            }

            this.aliasUI.updateUIVisibility(true);
        } catch (error: any) {
            alert(error.message);
        }
    }

    private async handleSaveSettings(): Promise<void> {
        const settings = {
            targetWindow: (DomHelpers.isChecked('tab-settings-target-windows') ? '_blank' : '_self') as SearchEngine['targetWindow'],
            openAsUrl: DomHelpers.isChecked('tab-settings-open-as-url'),
            incognitoMode: DomHelpers.isChecked('tab-settings-open-incognito-mode'),
            enableMultiAlias: DomHelpers.isChecked('tab-settings-enable-multi-alias'),
            prefillUrl: DomHelpers.isChecked('tab-settings-prefill-url')
        };

        await this.searchEngineService.saveSettings(settings);
    }

    private async handleClearData(): Promise<void> {
        if (confirm("Do you really want to delete all aliases?")) {
            await this.searchEngineService.clearAllAliases();
            this.aliasUI.updateUIVisibility(false);
        }
    }

    private async handleImport(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (file) {
            try {
                const fileContent = await new Response(file).json();
                await this.searchEngineService.importAliases(fileContent);
                const updatedSearchEngines = await this.searchEngineService.loadSavedData();
                this.aliasUI.displayData(updatedSearchEngines);
            } catch (error: any) {
                alert(`Error importing file: ${error.message}`);
            }
        }
    }

    private handleExport(): void {
        if (this.searchEngineService.hasAliases()) {
            const exportData = this.searchEngineService.exportAliases();
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'aliases.json';
            a.click();

            URL.revokeObjectURL(url);
        } else {
            alert("No data to export");
        }
    }
}

new Options();