import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../shared/models/api-error.model';
import { AuthService } from '../../core/services/auth.service';
import { GoogleSignInService } from '../../core/services/google-sign-in.service';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { environment } from '../../../environments/environment';
import { safeReturnUrl } from '../../core/guards/auth.guard';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{4,16}$/;

@Component({
  selector: 'app-registration-page',
  standalone: true,
  imports: [RouterLink, StateMessage],
  template: `
    @if (auth.pendingRegistration(); as pending) {
      <section class="registration-panel" aria-labelledby="registration-title">
        <header>
          <h1 id="registration-title">Crear cuenta</h1>
          <p>Completa el registro con un nombre de usuario.</p>
        </header>

        @if (pending.notice) {
          <p class="notice">{{ pending.notice }}</p>
        }

        <div class="verified-email">
          <span class="verified-icon" aria-hidden="true">✓</span>
          <div>
            <span class="email">{{ pending.email }}</span>
            <span class="verified-label">Verificado por Google</span>
          </div>
        </div>

        <form (submit)="submitRegistration($event)" novalidate>
          <label for="username">Nombre de usuario</label>
          <div class="username-input">
            <input
              id="username"
              type="text"
              autocomplete="username"
              maxlength="16"
              [value]="username()"
              [attr.aria-invalid]="usernameError() !== null"
              aria-describedby="username-requirements username-counter"
              (input)="updateUsername($event)"
              (blur)="usernameTouched.set(true)"
            />
            <span aria-hidden="true">{{ username().length }}/16</span>
          </div>
          <span id="username-counter" class="visually-hidden" aria-live="polite" aria-atomic="true">
            {{ announcedCount() }} de 16 caracteres
          </span>

          <ul
            id="username-requirements"
            class="requirements"
            aria-label="Requisitos del nombre de usuario"
            aria-live="polite"
          >
            <li [class.met]="hasValidLength()">
              <span aria-hidden="true">{{ hasValidLength() ? '✓' : '○' }}</span>
              Entre 4 y 16 caracteres
              <span class="requirement-status">
                {{ hasValidLength() ? 'Cumplido' : 'Pendiente' }}
              </span>
            </li>
            <li [class.met]="hasAllowedCharacters()">
              <span aria-hidden="true">{{ hasAllowedCharacters() ? '✓' : '○' }}</span>
              Solo letras, números, _, . y -
              <span class="requirement-status">
                {{ hasAllowedCharacters() ? 'Cumplido' : 'Pendiente' }}
              </span>
            </li>
          </ul>

          @if (usernameError(); as message) {
            <p class="field-error" role="alert">{{ message }}</p>
          }

          @if (registrationError(); as error) {
            @if (!hasUsernameErrors()) {
              <app-state-message
                kind="error"
                title="No se pudo crear la cuenta"
                [message]="operationErrorMessage() ?? error.message"
              />
            }
          }

          <div class="actions">
            <button type="submit" class="primary-button" [disabled]="!canSubmit()">
              {{ registering() ? 'Creando cuenta…' : 'Crear cuenta' }}
            </button>
            <button
              type="button"
              class="secondary-button"
              [disabled]="registering()"
              (click)="cancel()"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    } @else {
      <section class="registration-panel" aria-labelledby="registration-title">
        <header>
          <h1 id="registration-title">Crear cuenta</h1>
          <p>Verifica tu Gmail con Google para registrarte.</p>
        </header>

        @if (!clientIdConfigured) {
          <app-state-message
            kind="error"
            title="Acceso no disponible"
            message="El acceso con Google no está configurado."
          />
        } @else if (googleSignIn.loading()) {
          <app-state-message
            kind="loading"
            title="Cargando Google"
            message="Preparando la verificación."
          />
        } @else if (googleSignIn.error(); as sdkError) {
          <app-state-message kind="error" title="No se pudo cargar Google" [message]="sdkError" />
          <button type="button" class="secondary-button" (click)="retrySdk()">Reintentar</button>
        } @else {
          @if (signingIn()) {
            <app-state-message
              kind="loading"
              title="Verificando cuenta"
              message="Comprobando tu cuenta de Google."
            />
          }
          @if (operationError(); as error) {
            <app-state-message
              kind="error"
              title="No se pudo verificar la cuenta"
              [message]="operationErrorMessage() ?? error.message"
            />
          }
          @if (sdkReady()) {
            <div class="google-button" #googleButton aria-label="Registrarse con Google"></div>
          }
        }

        <a class="login-link" routerLink="/login">¿Ya tienes cuenta? Iniciar sesión</a>
      </section>
    }
  `,
  styles: `
    .registration-panel {
      display: grid;
      width: min(460px, 100%);
      gap: var(--space-6);
      margin: var(--space-8) auto;
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    h1 {
      margin: 0;
      font-size: 1.7rem;
    }

    header p:last-child {
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .verified-email {
      display: flex;
      min-height: 56px;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .verified-icon {
      display: grid;
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 50%;
      background: var(--risk-normal-bg);
      color: var(--risk-normal-text);
      font-weight: 800;
    }

    .email {
      overflow-wrap: anywhere;
      font-weight: 650;
    }

    .verified-label {
      display: block;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    form {
      display: grid;
      gap: var(--space-3);
    }

    label {
      font-weight: 650;
    }

    .username-input {
      display: flex;
      min-height: 48px;
      align-items: center;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
    }

    input {
      width: 100%;
      min-width: 0;
      min-height: 46px;
      padding: 0 var(--space-3);
      border: 0;
      border-radius: inherit;
      background: transparent;
      color: var(--color-text);
      font: inherit;
    }

    .username-input > span {
      flex: 0 0 auto;
      padding: 0 var(--space-3);
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-variant-numeric: tabular-nums;
    }

    .requirements {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
      list-style: none;
    }

    .requirements li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .requirements .met {
      color: var(--risk-normal-text);
      font-weight: 650;
    }

    .requirement-status {
      font-weight: 600;
    }

    .field-error {
      margin: 0;
      color: var(--risk-fire-text);
      font-weight: 600;
    }

    .actions {
      display: grid;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    .primary-button,
    .secondary-button {
      min-height: 44px;
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
    }

    .primary-button {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .secondary-button {
      background: var(--color-surface);
      color: var(--color-text);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .google-button {
      display: flex;
      min-height: 44px;
      justify-content: center;
      overflow: hidden;
    }

    .login-link {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      color: var(--color-focus);
      font-weight: 650;
      text-align: center;
    }

    .notice {
      margin: 0;
      padding: var(--space-3);
      border-inline-start: 4px solid var(--color-focus);
      background: var(--color-surface-muted);
      color: var(--color-text);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      clip-path: inset(50%);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly googleButton = viewChild<ElementRef<HTMLElement>>('googleButton');
  private sdkLoadStarted = false;
  private renderedButton: HTMLElement | null = null;
  private countAnnouncementTimer: ReturnType<typeof setTimeout> | null = null;

  readonly googleSignIn = inject(GoogleSignInService);
  readonly clientIdConfigured = environment.googleClientId.trim() !== '';
  readonly username = signal('');
  readonly announcedCount = signal(0);
  readonly sdkReady = signal(false);
  readonly signingIn = signal(false);
  readonly registering = signal(false);
  readonly usernameTouched = signal(false);
  readonly operationError = signal<ApiError | null>(null);
  readonly registrationError = signal<ApiError | null>(null);
  readonly operationErrorMessage = computed(() => {
    const error = this.operationError();
    if (
      error === null ||
      error.kind !== 'throttled' ||
      error.retryAfter === undefined ||
      error.message.includes(`${error.retryAfter} s`)
    ) {
      return error?.message ?? null;
    }
    return `${error.message} Tiempo de espera: ${error.retryAfter} s.`;
  });
  readonly hasValidLength = computed(
    () => this.username().length >= 4 && this.username().length <= 16,
  );
  readonly hasAllowedCharacters = computed(() => /^[A-Za-z0-9_.-]*$/.test(this.username()));
  readonly localUsernameError = computed(() => {
    if (!this.hasValidLength()) {
      return 'El nombre de usuario debe tener entre 4 y 16 caracteres.';
    }
    if (!USERNAME_PATTERN.test(this.username())) {
      return 'Usa solo letras, números, guion, guion bajo o punto.';
    }
    return null;
  });
  readonly backendUsernameErrors = computed(() => {
    const errors = this.registrationError()?.errors?.['username'];
    if (typeof errors === 'string') {
      return [errors];
    }
    if (Array.isArray(errors)) {
      return errors.filter((item): item is string => typeof item === 'string');
    }
    return [];
  });
  readonly hasUsernameErrors = computed(() => this.backendUsernameErrors().length > 0);
  readonly usernameError = computed(() => {
    if (this.usernameTouched() && this.localUsernameError() !== null) {
      return this.localUsernameError();
    }
    return this.backendUsernameErrors()[0] ?? null;
  });
  readonly canSubmit = computed(() => !this.registering() && this.localUsernameError() === null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.countAnnouncementTimer !== null) {
        clearTimeout(this.countAnnouncementTimer);
      }
    });

    effect(() => {
      const pending = this.auth.pendingRegistration();
      if (pending === null) {
        this.username.set('');
        this.announcedCount.set(0);
        this.usernameTouched.set(false);
        this.registrationError.set(null);
        this.ensureSdkLoaded();
        return;
      }

      this.username.set(pending.suggestedUsername);
      this.announcedCount.set(pending.suggestedUsername.length);
      this.usernameTouched.set(false);
      this.registrationError.set(null);
    });

    effect(() => {
      const credential = this.googleSignIn.credential();
      if (credential !== null) {
        this.googleSignIn.credential.set(null);
        this.verifyGoogleAccount(credential);
      }
    });

    effect(() => {
      const button = this.googleButton()?.nativeElement;
      if (
        this.auth.pendingRegistration() !== null ||
        !this.sdkReady() ||
        button === undefined ||
        this.renderedButton === button
      ) {
        return;
      }
      this.renderedButton = button;
      this.googleSignIn.renderButton(button, {
        type: 'standard',
        text: 'signup_with',
        locale: 'es',
        width: 280,
        size: 'large',
      });
    });
  }

  updateUsername(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.username.set(target.value);
    this.usernameTouched.set(true);
    this.registrationError.set(null);
    if (this.countAnnouncementTimer !== null) {
      clearTimeout(this.countAnnouncementTimer);
    }
    this.countAnnouncementTimer = setTimeout(() => {
      this.announcedCount.set(this.username().length);
      this.countAnnouncementTimer = null;
    }, 500);
  }

  submitRegistration(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit() || this.auth.pendingRegistration() === null) {
      return;
    }

    this.operationError.set(null);
    this.registrationError.set(null);
    this.registering.set(true);
    this.auth.registerWithGoogle(this.username()).subscribe({
      next: () => {
        this.registering.set(false);
        void this.router.navigateByUrl(this.getReturnUrl());
      },
      error: (error: unknown) => {
        this.registering.set(false);
        const apiError = this.toApiError(error);
        this.operationError.set(apiError);
        this.registrationError.set(apiError);
      },
    });
  }

  cancel(): void {
    this.auth.cancelRegistration();
    this.operationError.set(null);
    this.registrationError.set(null);
  }

  retrySdk(): void {
    this.sdkReady.set(false);
    this.renderedButton = null;
    this.sdkLoadStarted = false;
    this.ensureSdkLoaded();
  }

  private ensureSdkLoaded(): void {
    if (!this.clientIdConfigured || this.sdkLoadStarted) {
      return;
    }
    this.sdkLoadStarted = true;
    void this.googleSignIn.load().then(() => {
      this.sdkLoadStarted = false;
      this.sdkReady.set(this.googleSignIn.error() === null);
    });
  }

  private verifyGoogleAccount(credential: string): void {
    if (this.signingIn()) {
      return;
    }
    this.operationError.set(null);
    this.signingIn.set(true);
    this.auth.loginWithGoogle(credential).subscribe({
      next: (result) => {
        this.signingIn.set(false);
        if (result.kind === 'signed-in') {
          void this.router.navigateByUrl(this.getReturnUrl());
        }
      },
      error: (error: unknown) => {
        this.signingIn.set(false);
        this.operationError.set(this.toApiError(error));
      },
    });
  }

  private getReturnUrl(): string {
    return safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  private toApiError(error: unknown): ApiError {
    if (isApiError(error)) {
      return error;
    }
    return {
      kind: 'unknown',
      message: 'No se pudo completar la operación. Inténtalo de nuevo.',
    };
  }
}

function isApiError(error: unknown): error is ApiError {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('kind' in error) ||
    !('message' in error) ||
    typeof error.message !== 'string'
  ) {
    return false;
  }

  return (
    error.kind === 'network' ||
    error.kind === 'unauthorized' ||
    error.kind === 'throttled' ||
    error.kind === 'conflict' ||
    error.kind === 'not-found' ||
    error.kind === 'server' ||
    error.kind === 'unknown'
  );
}
