import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, PendingGoogleRegistration } from '../../core/services/auth.service';
import { GoogleSignInService } from '../../core/services/google-sign-in.service';
import { ApiError } from '../../shared/models/api-error.model';
import { RegistrationPage } from './registration-page';

describe('RegistrationPage', () => {
  const originalClientId = environment.googleClientId;
  const pendingAccount: PendingGoogleRegistration = {
    credential: 'simulated-credential',
    email: 'ada@gmail.com',
    name: 'Ada',
    suggestedUsername: 'ada.user',
    notice: 'Es tu primera vez con esta cuenta: elige un nombre de usuario para terminar.',
  };
  let credential: ReturnType<typeof signal<string | null>>;
  let pendingRegistration: ReturnType<typeof signal<PendingGoogleRegistration | null>>;
  let googleError: ReturnType<typeof signal<string | null>>;
  let googleLoading: ReturnType<typeof signal<boolean>>;
  let loginWithGoogle: ReturnType<typeof vi.fn>;
  let registerWithGoogle: ReturnType<typeof vi.fn>;
  let cancelRegistration: ReturnType<typeof vi.fn>;
  let load: ReturnType<typeof vi.fn>;
  let renderButton: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    environment.googleClientId = 'test-client-id';
    credential = signal<string | null>(null);
    pendingRegistration = signal<PendingGoogleRegistration | null>(null);
    googleError = signal<string | null>(null);
    googleLoading = signal(false);
    loginWithGoogle = vi.fn(() => of({ kind: 'registration-required' as const }));
    registerWithGoogle = vi.fn(() => of(undefined));
    cancelRegistration = vi.fn(() => pendingRegistration.set(null));
    load = vi.fn(() => Promise.resolve());
    renderButton = vi.fn();

    await TestBed.configureTestingModule({
      imports: [RegistrationPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            pendingRegistration: pendingRegistration.asReadonly(),
            loginWithGoogle,
            registerWithGoogle,
            cancelRegistration,
          },
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

  it('should show the first step and render the Spanish Google signup button', async () => {
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Crear cuenta');
    expect(fixture.nativeElement.textContent).toContain(
      'Verifica tu Gmail con Google para registrarte.',
    );
    expect(fixture.nativeElement.textContent).toContain('¿Ya tienes cuenta? Iniciar sesión');
    expect(load).toHaveBeenCalledOnce();
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        type: 'standard',
        text: 'signup_with',
        locale: 'es',
        width: 280,
      }),
    );
  });

  it('should show the pending verified email, suggested username, counter, and requirements', () => {
    pendingRegistration.set(pendingAccount);
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('ada@gmail.com');
    expect(element.textContent).toContain('Verificado por Google');
    expect(element.textContent).toContain(
      'Es tu primera vez con esta cuenta: elige un nombre de usuario para terminar.',
    );
    expect(element.querySelector<HTMLInputElement>('#username')?.value).toBe('ada.user');
    expect(element.querySelector('.username-input')?.textContent).toContain('8/16');
    expect(element.querySelector('[aria-live="polite"]')?.textContent).toContain('8 de 16');
    expect(element.textContent).toContain('Entre 4 y 16 caracteres');
    expect(element.textContent).toContain('Solo letras, números, _, . y -');
  });

  it('should disable submission and show local validation errors', () => {
    pendingRegistration.set(pendingAccount);
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#username');
    if (input === null) {
      throw new Error('No se encontró el campo de nombre de usuario.');
    }
    input.value = 'ab!';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'entre 4 y 16 caracteres',
    );
    expect(element.textContent).toContain('○');
  });

  it('should show username errors returned by the backend under the field', () => {
    pendingRegistration.set(pendingAccount);
    registerWithGoogle.mockReturnValue(
      throwError(
        () =>
          ({
            kind: 'unknown',
            message: 'La solicitud no pudo completarse.',
            errors: { username: ['Ese nombre de usuario no está disponible.'] },
          }) satisfies ApiError,
      ),
    );
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();
    submitForm(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('Ese nombre de usuario no está disponible.');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'La solicitud no pudo completarse.',
    );
  });

  it('should show the backend retry wait for a throttled registration', () => {
    pendingRegistration.set(pendingAccount);
    registerWithGoogle.mockReturnValue(
      throwError(
        () =>
          ({
            kind: 'throttled',
            message: 'Espera para volver a intentar.',
            retryAfter: 45,
          }) satisfies ApiError,
      ),
    );
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();
    submitForm(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Espera para volver a intentar.',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tiempo de espera: 45 s.');
  });

  it('should cancel pending registration and return to the first step', async () => {
    pendingRegistration.set(pendingAccount);
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.secondary-button')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(cancelRegistration).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Verifica tu Gmail con Google para registrarte.',
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('#username')).toBeNull();
  });

  it('should display an expired verification message and return to the first step', async () => {
    pendingRegistration.set(pendingAccount);
    registerWithGoogle.mockImplementation(() => {
      pendingRegistration.set(null);
      return throwError(
        () =>
          ({
            kind: 'unknown',
            message: 'La verificación de Google venció. Verifica tu cuenta otra vez.',
          }) satisfies ApiError,
      );
    });
    const fixture = TestBed.createComponent(RegistrationPage);
    fixture.detectChanges();
    submitForm(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('#username')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'La verificación de Google venció. Verifica tu cuenta otra vez.',
    );
  });

  it('should create the account and navigate to the safe return URL', () => {
    pendingRegistration.set(pendingAccount);
    const fixture = TestBed.createComponent(RegistrationPage);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    submitForm(fixture.nativeElement as HTMLElement);

    expect(registerWithGoogle).toHaveBeenCalledWith('ada.user');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('should sign in immediately if Google verification returns an existing account', async () => {
    loginWithGoogle.mockReturnValue(of({ kind: 'signed-in' as const }));
    const fixture = TestBed.createComponent(RegistrationPage);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    credential.set('simulated-credential');
    fixture.detectChanges();

    expect(loginWithGoogle).toHaveBeenCalledWith('simulated-credential');
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

function submitForm(element: HTMLElement): void {
  const form = element.querySelector('form');
  if (form === null) {
    throw new Error('No se encontró el formulario de registro.');
  }
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
