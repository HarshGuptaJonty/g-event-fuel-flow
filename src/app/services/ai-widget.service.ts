import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { APPLICATION_DATA } from "../shared/constants";
import { Message } from "../../assets/models/AiChat";

@Injectable({
    providedIn: 'root'
})
export class AiWidgetService {

    isWidgetVisible: boolean = false;
    isWidgetOpen: boolean = false;
    aiStatus: 'thinking' | 'ready' | 'error' = 'ready';
    messages: Message[] = [{
        content: 'Hello! How can I assist you today?',
        from: 'ai',
        timestamp: Date.now()
    }];

    constructor(
        private httpClient: HttpClient
    ) { }

    userEnteredPrompt(prompt: string): Observable<any> {
        return this.httpClient.post(APPLICATION_DATA.AI_AGENT_ENDPOINT, { message: prompt }, {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    clearChatHistory() {
        this.messages = [{
            content: 'Hello! How can I assist you today?',
            from: 'ai',
            timestamp: Date.now()
        }];
    }
}

/*
fetch('https://cylinder-agent-406734351582.europe-west1.run.app/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
      message: "Ramesh returned 10 Oxygen cylinders" 
  })
})
.then(response => response.json())
.then(data => console.log("AI SAYS:", data));
*/