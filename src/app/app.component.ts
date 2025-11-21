import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NotificationComponent } from './common/notification/notification.component';
import { ConfirmationModelComponent } from "./common/confirmation-model/confirmation-model.component";
import { EntryDetailComponent } from "./common/entry-detail/entry-detail.component";
import { ExportModelComponent } from "./common/export-model/export-model.component";
import { ShortcutService } from './services/shortcut.service';
import { DEVELOPER } from './shared/constants';
import { CommonModule } from '@angular/common';
import { WindowResizeService } from './services/window-resize.service';
import { FirebaseService } from './services/firebase.service';
import { LoaderComponent } from './common/loader/loader.component';
import { AiWidgetComponent } from './common/ai-widget/ai-widget.component';
import { AiWidgetService } from './services/ai-widget.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NotificationComponent,
    ConfirmationModelComponent,
    EntryDetailComponent,
    ExportModelComponent,
    LoaderComponent,
    AiWidgetComponent,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  constructor(
    private shortcutService: ShortcutService,
    private windowResizeService: WindowResizeService,
    private firebaseService: FirebaseService,
    private router: Router,
    public aiWidgetService: AiWidgetService
  ) { }

  timeInterval = 1000;
  lastTriggeredTime = 0;
  isDeveloperMode = DEVELOPER.IS_DEV_ENVIRONMENT;
  isStageMode = DEVELOPER.IS_STAGE_ENVIRONMENT;
  isLocalDatabase = DEVELOPER.USE_LOCAL_DATABASE;

  ngOnInit(): void {
    this.onResize();
    this.firebaseService.setAuthPersistence();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.windowResizeService.setScreenWidth(window.innerWidth);
  }

  @HostListener('window:keydown.control.e', ['$event'])
  newEntryShortcut(event: KeyboardEvent) {
    event.preventDefault();
    const now = new Date();

    const currentTime = now.getTime();
    if (currentTime - this.lastTriggeredTime > this.timeInterval)
      this.shortcutService.triggerShortcut(this.shortcutService.SHORTCUT.NEW_ENTRY);
    this.lastTriggeredTime = currentTime;
  }

  @HostListener('window:keydown.control.a', ['$event'])
  newAccountShortcut(event: KeyboardEvent) {
    event.preventDefault();
    const now = new Date();

    const currentTime = now.getTime();
    if (currentTime - this.lastTriggeredTime > this.timeInterval) {
      this.shortcutService.triggerShortcut(this.shortcutService.SHORTCUT.NEW_ACCOUNT);
      this.lastTriggeredTime = currentTime;
    }
  }

  @HostListener('window:keydown.control.s', ['$event'])
  activateSearchShortcut(event: KeyboardEvent) {
    event.preventDefault();
    const now = new Date();

    const currentTime = now.getTime();
    if (currentTime - this.lastTriggeredTime > this.timeInterval)
      this.shortcutService.triggerShortcut(this.shortcutService.SHORTCUT.ACTIVATE_SEARCH);
    this.lastTriggeredTime = currentTime;
  }

  @HostListener('window:keydown.control.r', ['$event'])
  refreshDataShortcut(event: KeyboardEvent) {
    event.preventDefault();
    const now = new Date();

    const currentTime = now.getTime();
    if (currentTime - this.lastTriggeredTime > this.timeInterval)
      this.shortcutService.triggerShortcut(this.shortcutService.SHORTCUT.REFRESH_DATA);
    this.lastTriggeredTime = currentTime;
  }

  openCustomDevelop() {
    this.router.navigate(['/dashboard/custom-develop']);
  }
}