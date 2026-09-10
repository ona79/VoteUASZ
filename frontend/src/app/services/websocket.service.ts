import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { LiveResultsDto } from '../models/vote.models';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private resultsSubject = new BehaviorSubject<LiveResultsDto | null>(null);
  public results$: Observable<LiveResultsDto | null> = this.resultsSubject.asObservable();

  connect(electionId: number): void {
    // Correction du mismatch: /ws correspond à l'endpoint déclaré dans WebSocketConfig.java
    const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws/websocket';

    this.stompClient = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('STOMP Connected to VoteUASZ WebSocket — /ws endpoint');
      this.stompClient?.subscribe(`/topic/results/${electionId}`, (message: IMessage) => {
        try {
          const payload: LiveResultsDto = JSON.parse(message.body);
          this.resultsSubject.next(payload);
        } catch (e) {
          console.error('Erreur de parsing des résultats STOMP', e);
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('STOMP Error:', frame.headers['message'], frame.body);
    };

    this.stompClient.activate();
  }

  disconnect(): void {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
    }
  }
}
