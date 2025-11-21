import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiWidgetService } from '../../services/ai-widget.service';
import { Message } from '../../../assets/models/AiChat';
import { Router } from '@angular/router';
import { EntryDataService } from '../../services/entry-data.service';

@Component({
  selector: 'app-ai-widget',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './ai-widget.component.html',
  styleUrl: './ai-widget.component.scss'
})
export class AiWidgetComponent {

  userInput: string = '';

  constructor(
    public aiWidgetService: AiWidgetService,
    private entryDataService: EntryDataService,
    private router: Router
  ) { }

  sendMessage() {
    if (this.userInput.trim()) {
      this.aiWidgetService.aiStatus = 'thinking';
      this.aiWidgetService.messages.push({ content: this.userInput, from: 'user', timestamp: Date.now() });
      this.scrollToBottom();
      this.aiWidgetService.userEnteredPrompt(this.userInput).subscribe((response: any) => {
        if (response.response){
          this.aiWidgetService.messages.push({ content: response.response, action: response.action, from: 'ai', timestamp: Date.now(), context: response });
          if(response.entry_status === 'SUCCESS') {
            this.entryDataService.addNewEntryInCache(response.context);
          }
        } else
          this.aiWidgetService.messages.push({ content: response?.warning?.text || 'Something went Wrong', action: response?.warning?.action, from: 'ai', timestamp: Date.now(), context: response });

        this.aiWidgetService.aiStatus = 'ready';
        this.scrollToBottom();
      }, error => {
        this.aiWidgetService.messages.push({ content: 'Error: Unable to get response from AI.', from: 'ai', timestamp: Date.now() });
        this.aiWidgetService.aiStatus = 'error';
        this.scrollToBottom();
      });
      this.userInput = '';
    }
  }

  openProfile(message: Message) {
    let objectId = message.context?.objectArray?.[0]?.userId;
    if (message?.content?.toLowerCase().includes("customer"))
      this.router.navigate(['/dashboard/customers'], { queryParams: { userId: objectId } }); ///dashboard/customers?userId=XmfXxRgbaUqHJT
    else if (message?.content?.toLowerCase().includes("delivery"))
      this.router.navigate(['/dashboard/delivery'], { queryParams: { userId: objectId } }); ///http://localhost:4200/dashboard/delivery?userId=xnPx9GJwmsQ2j7
    else {
      objectId = message.context?.objectArray?.[0]?.productId;
      this.router.navigate(['/dashboard/warehouse'], { queryParams: { productId: objectId } }); ///http://localhost:4200/dashboard/warehouse?productId=181504_a2Vcv
    }
  }

  closeWidget() {
    this.aiWidgetService.isWidgetOpen = false;
  }

  openWidget() {
    this.aiWidgetService.clearChatHistory();
    this.aiWidgetService.isWidgetOpen = true;
  }

  scrollToBottom() {
    setTimeout(() => {
      const chatMessagesDiv = document.querySelector('.chat-messages');
      if (chatMessagesDiv) {
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
      }
    }, 100);
  }

  formatDateAndTime(timestamp: number): string {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const date = new Date(timestamp);
    return date.toLocaleString();
  }
}