import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class ShortcutService {

    shortcutTriggered = new Subject<any>();

    SHORTCUT = {
        NEW_ENTRY: 'CTRL_E', // Ctrl + E in app-component
        NEW_ACCOUNT: 'CTRL_A', // Ctrl + A in app-component
        ACTIVATE_SEARCH: 'CTRL_S', // Ctrl + S in app-component
        REFRESH_DATA: 'CTRL_R', // Ctrl + R in app-component
    }

    triggerShortcut(shortCutCode: string) {
        this.shortcutTriggered.next(shortCutCode);
    }
}