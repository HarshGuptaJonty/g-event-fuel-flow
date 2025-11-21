import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
    selector: 'app-resuable-tooltip',
    imports: [
        CommonModule
    ],
    templateUrl: './resuable-tooltip.component.html',
    styleUrl: './resuable-tooltip.component.scss'
})
export class ResuableTooltipComponent {

    @Input() data: any;
    @Input() hasLink = false;
    @Input() placement: 'top' | 'bottom' = 'bottom';

    @Output() openProductLink = new EventEmitter<string>();
    @Output() openProfileLink = new EventEmitter<string>();
    
    static currentlyOpen: ResuableTooltipComponent | null = null;
    showTooltip = false;

    toggleTooltip(event: MouseEvent) {
        event.stopPropagation();

        if (ResuableTooltipComponent.currentlyOpen && ResuableTooltipComponent.currentlyOpen !== this)
            ResuableTooltipComponent.currentlyOpen.hideTooltip();

        this.showTooltip = !this.showTooltip;
        ResuableTooltipComponent.currentlyOpen = this.showTooltip ? this : null;
    }

    hideTooltip() {
        this.showTooltip = false;
    }

    @HostListener('document:click')
    onDocumentClick() {
        this.hideTooltip();
        if (ResuableTooltipComponent.currentlyOpen === this)
            ResuableTooltipComponent.currentlyOpen = null;
    }
}