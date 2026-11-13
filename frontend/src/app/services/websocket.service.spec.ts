import { TestBed } from '@angular/core/testing';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

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
});
