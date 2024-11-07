export class DomHelpers {
    static getInputElementById(id: string): HTMLInputElement | null {
        return document.getElementById(id) as HTMLInputElement | null;
    }

    static isChecked(id: string): boolean {
        const checkbox = this.getInputElementById(id);
        return checkbox ? checkbox.checked : false;
    }

    static setCheckboxValue(id: string, value: boolean): void {
        const checkbox = this.getInputElementById(id);
        if (checkbox) checkbox.checked = value;
    }

    static showElement(id: string, show: boolean): void {
        const element = document.getElementById(id);
        if (element) element.style.display = show ? 'block' : 'none';
    }
}
