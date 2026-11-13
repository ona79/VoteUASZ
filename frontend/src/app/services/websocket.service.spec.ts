import { TestBed } from '@angular/core/testing';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';
import * as env from '../../environments/environment';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken']);
    authServiceSpy.getToken.and.returnValue('fake-jwt-token');

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    service.disconnect();
    // Restore environment to dev defaults
    (env.environment as any).wsUrl = '';
    (env.environment as any).production = false;
  });

  it('should be created with null initial results', (done) => {
    expect(service).toBeTruthy();
    service.results$.subscribe((res) => {
      expect(res).toBeNull();
      done();
    });
  });

  it('should configure STOMP client with /ws endpoint and Bearer token on connect', () => {
    service.connect(42);
    const client = (service as any).stompClient;
    expect(client).toBeTruthy();
    expect(client.brokerURL).toContain('/ws');
    expect(client.connectHeaders['Authorization']).toBe('Bearer fake-jwt-token');
  });

  it('should safely handle disconnect when not active', () => {
    expect(() => service.disconnect()).not.toThrow();
  });

  it('LOT D — should use environment.wsUrl when defined (production)', () => {
    // Simulate production environment
    (env.environment as any).wsUrl = 'wss://voteuasz-backend.onrender.com';
    (env.environment as any).production = true;

    service.connect(99);
    const client = (service as any).stompClient;
    expect(client).toBeTruthy();
    expect(client.brokerURL).toBe('wss://voteuasz-backend.onrender.com/ws');
  });

  it('LOT D — should fallback to window.location.host when wsUrl is empty (dev)', () => {
    (env.environment as any).wsUrl = '';
    (env.environment as any).production = false;

    service.connect(1);
    const client = (service as any).stompClient;
    expect(client).toBeTruthy();
    // In test (Karma), window.location.host is localhost:xxxx
    expect(client.brokerURL).toContain(window.location.host);
    expect(client.brokerURL).toContain('/ws');
  });
});
