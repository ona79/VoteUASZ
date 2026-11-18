import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { passwordChangeGuard } from './auth.guard';

describe('passwordChangeGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'mustChangePassword']);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  it('should redirect to /change-password when user is logged in and mustChangePassword is true', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);
    authServiceSpy.mustChangePassword.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => passwordChangeGuard({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/change-password');
  });

  it('should allow navigation when mustChangePassword is false', () => {
    authServiceSpy.isLoggedIn.and.returnValue(true);
    authServiceSpy.mustChangePassword.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => passwordChangeGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });
});
