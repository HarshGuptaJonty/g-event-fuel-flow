import { AfterViewInit, Component, Renderer2 } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  imports: [
    CommonModule
  ],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent implements AfterViewInit {

  constructor(
    public notificationService: NotificationService,
    private renderer: Renderer2
  ) { }

  currentPosition = 'right';

  ngAfterViewInit(): void {
    const notificationContainer = document.querySelector('.notification-container');

    if (notificationContainer) {
      this.renderer.listen(notificationContainer, 'mouseover', () => {
        this.renderer.removeClass(notificationContainer, this.currentPosition === 'right' ? 'moved-right' : 'moved-left');
        this.renderer.addClass(notificationContainer, this.currentPosition === 'right' ? 'moved-left' : 'moved-right');
        this.currentPosition = this.currentPosition === 'right' ? 'left' : 'right';
      });
    }
  }
}
