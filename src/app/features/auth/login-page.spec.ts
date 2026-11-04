import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { GoogleSignInService } from '../../core/services/google-sign-in.service';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  const originalClientId = environment.googleClientId;
  let credential: ReturnType<typeof signal<string | null>>;
  let googleError: ReturnType<typeof signal<string | null>>;
  let googleLoading: ReturnType<typeof signal<boolean>>;
  let currentUser: ReturnType<typeof signal<AuthUser | null>>;
  let restoring: ReturnType<typeof signal<boolean>>;
  let loginWithGoogle: ReturnType<typeof vi.fn>;
  let load: ReturnType<typeof vi.fn>;
  let renderButton: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    environment.googleClientId = 'test-client-id';
    credential = signal<string | null>(null);
    googleError = signal<string | null>(null);
    googleLoading = signal(false);
    currentUser = signal<AuthUser | null>(null);
    restoring = signal(false);
    loginWithGoogle = vi.fn(() => of(undefined));
    load = vi.fn(() => Promise.resolve());
    renderButton = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser, restoring, loginWithGoogle },
        },
        {
          provide: GoogleSignInService,
          useValue: {
            credential,
            error: googleError,
            loading: googleLoading,
            load,
            renderButton,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    environment.googleClientId = originalClientId;
  });

  it('should load Google and render its Spanish continue button', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(load).toHaveBeenCalledOnce();
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        type: 'standard',
        text: 'continue_with',
        locale: 'es',
        width: 320,
      }),
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Inicia sesión con tu cuenta de Gmail. Solo se admiten cuentas @gmail.com verificadas por Google.',
    );
  });

  it('should show a configuration message without loading Google when there is no client ID', () => {
    environment.googleClientId = '';
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    expect(load).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'El acceso con Google no está configurado.',
    );
    expect(fixture.nativeElement.querySelector('.google-button')).toBeNull();
  });

  it('should display an error returned by the backend', async () => {
    loginWithGoogle.mockReturnValue(
      throwError(() => ({
        kind: 'unknown',
        message: 'Solo se admiten cuentas @gmail.com verificadas por Google.',
      })),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    credential.set('simulated-credential');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loginWithGoogle).toHaveBeenCalledWith('simulated-credential');
    expect(fixture.nativeElement.textContent).toContain(
      'Solo se admiten cuentas @gmail.com verificadas por Google.',
    );
  });

  it('should show the Retry-After message returned for a throttled request', async () => {
    loginWithGoogle.mockReturnValue(
      throwError(() => ({
        kind: 'throttled',
        message: 'Se alcanzó el límite de intentos. Inténtalo de nuevo en 60 s.',
        retryAfter: 60,
      })),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    credential.set('simulated-credential');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inténtalo de nuevo en 60 s.');
  });

  it('should redirect to the dashboard when a session already exists', async () => {
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });
    const fixture = TestBed.createComponent(LoginPage);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/');
    expect(load).not.toHaveBeenCalled();
  });

  it('should display a server configuration error from the API', async () => {
    loginWithGoogle.mockReturnValue(
      throwError(() => ({
        kind: 'server',
        message: 'El acceso con Google no está configurado.',
      })),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    credential.set('simulated-credential');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'El acceso con Google no está configurado.',
    );
  });
});
