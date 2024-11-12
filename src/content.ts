import browser from "webextension-polyfill";
import { SearchHandler } from "./services/search-handler";
import { SearchState } from "./services/search-state";
import { CurrentTabUrl, PopupElements } from "./services/types";
import { PopupUI } from "./ui/popup";

class SearchApplication {
  private state: SearchState;
  private handler: SearchHandler;

  constructor() {
    this.state = new SearchState();
    this.handler = new SearchHandler(this.state);
  }

  async initialize(): Promise<void> {
    await this.state.loadSearchEngines();
  }

  async openPopup(): Promise<void> {
    await this.initialize();
    const searchEngines = this.state.getSearchEngines();
    const elements = PopupUI.createPopupElement(searchEngines);

    if (searchEngines.prefillUrl) {
      const response: CurrentTabUrl = await browser.runtime.sendMessage({ action: 'getCurrentTabUrl' });

      if (response.url) {
        elements.userInput.value = response.url;
      }
    }

    this.setupEventListeners(elements);
    document.body.appendChild(elements.container);

    const userInputTxtLen = elements.userInput.value.length;
    elements.userInput.setSelectionRange(userInputTxtLen, userInputTxtLen);
    elements.userInput.focus();
  }

  private setupEventListeners(elements: PopupElements): void {
    const { container, userInput, activeAlias } = elements;

    userInput.addEventListener('keydown', (e) => e.stopPropagation());
    userInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const payload = this.handler.parseAliases(target.value);
      this.state.setCachedPayload(payload);
      activeAlias.innerText = this.getAliasDescription();
    });

    //@ts-ignore
    container.shadowRoot?.querySelector("#modal")?.addEventListener('keyup', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        this.handler.handleSearch(userInput.value);
        container.remove();
      }
    });

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === 'Escape') container.remove();
    }, { capture: true });
  }

  private getAliasDescription(): string {
    const { aliasDescriptions } = this.state.getCachedPayload();
    if (aliasDescriptions.length === 0) return 'No match found';

    const targetWindow = this.state.getSearchEngines().targetWindow;
    return `${aliasDescriptions.join(' - ')} | Target: ${targetWindow}`;
  }
}

const searchApp = new SearchApplication();

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "openPopup") {
    searchApp.openPopup();
  }
});
