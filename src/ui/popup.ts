import { PopupElements, SearchEngine } from "../services/types";

export class PopupUI {
  private static createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      :host {all: initial;}
      .p-0 { padding: 0; }
      #modal { display: flex; }
      #user-input { width: 100%; }
      span, input {
        font-family: sans-serif;
        font-size: medium;
        color: #d1d0c5;
        background-color: #323437;
        border: none;
        border-radius: .5rem;
        outline: none;
      }
      div {
        background-color: #323437;
        padding: 12px;
      }
      #preview-alias {
        display: flex;
        justify-content: space-between;
      }
    `;
    return style;
  }

  static createPopupElement(searchEngines: SearchEngine): PopupElements {
    const container = document.createElement('div');
    container.attachShadow({ mode: 'open' });
    container.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50%; z-index: 999999;";

    const popup = document.createElement('div');
    popup.style.cssText = 'border-radius: .5rem;';
    popup.innerHTML = `
      <div id="modal">
        <span class="searchicon">&#x1F50E;&#xFE0E;</span>
        <input type="text" id="user-input" placeholder="Search..." autocomplete="off" value="${searchEngines.defaultAlias || '' }">
      </div>
      <hr>
      <div id="preview-alias" class="p-0">
        <span id="active-alias">No match found</span>
        <span id="incognito-mode">Incognito mode: ${searchEngines.incognitoMode ? 'On' : 'Off'}</span>
      </div>
    `;

    container.shadowRoot?.appendChild(PopupUI.createStyles());
    container.shadowRoot?.appendChild(popup);

    return {
      container,
      userInput: container.shadowRoot?.querySelector('#user-input') as HTMLInputElement,
      activeAlias: container.shadowRoot?.querySelector('#active-alias') as HTMLSpanElement
    };
  }
}
