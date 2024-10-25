export class DomHelpers {
    static getInputElement(id: string): HTMLInputElement | null {
        return document.getElementById(id) as HTMLInputElement | null;
    }

    static isChecked(id: string): boolean {
        const checkbox = this.getInputElement(id);
        return checkbox ? checkbox.checked : false;
    }

    static setCheckboxValue(id: string, value: boolean): void {
        const checkbox = this.getInputElement(id);
        if (checkbox) checkbox.checked = value;
    }

    static showElement(id: string, show: boolean): void {
        const element = document.getElementById(id);
        if (element) element.style.display = show ? 'block' : 'none';
    }
}
