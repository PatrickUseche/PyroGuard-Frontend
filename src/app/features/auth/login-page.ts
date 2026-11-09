import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GoogleSignInService } from '../../core/services/google-sign-in.service';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [StateMessage],
  template: `
    <section class="login-panel" aria-labelledby="login-title">
      <header>
        <p class="eyebrow">Acceso de operación</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <p>
          Inicia sesión con tu cuenta de Gmail. Solo se admiten cuentas @gmail.com verificadas por
          Google.
        </p>
      </header>

      @if (!clientIdConfigured) {
        <app-state-message
          kind="error"
          title="Acceso no disponible"
          message="El acceso con Google no está configurado."
        />
      } @else if (auth.restoring()) {
        <app-state-message
          kind="loading"
          title="Comprobando sesión"
          message="Espera mientras verificamos tu cuenta."
        />
      } @else if (googleSignIn.loading()) {
        <app-state-message
          kind="loading"
          title="Cargando Google"
          message="Preparando el acceso seguro."
        />
      } @else if (googleSignIn.error(); as sdkError) {
        <app-state-message kind="error" title="No se pudo cargar Google" [message]="sdkError" />
        <button type="button" class="retry-button" (click)="retrySdk()">Reintentar</button>
      } @else {
        @if (signingIn()) {
          <app-state-message
            kind="loading"
            title="Iniciando sesión"
            message="Verificando tu cuenta de Google."
          />
        }
        @if (backendError(); as message) {
          <app-state-message kind="error" title="No se pudo iniciar sesión" [message]="message" />
        }
        @if (sdkReady()) {
          <div class="google-button" #googleButton aria-label="Continuar con Google"></div>
        }
      }
    </section>
  `,
  styles: `
    .login-panel {
      display: grid;
      width: min(460px, 100%);
      gap: var(--space-6);
      margin: var(--space-8) auto;
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .eyebrow {
      margin: 0 0 var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 1.7rem;
    }

    header p:last-child {
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .google-button {
      display: flex;
      min-height: 44px;
      justify-content: center;
      overflow: hidden;
    }

    .retry-button {
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-weight: 650;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly googleButton = viewChild<ElementRef<HTMLElement>>('googleButton');
  private sdkLoadStarted = false;
  private renderedButton: HTMLElement | null = null;

  readonly googleSignIn = inject(GoogleSignInService);
  readonly clientIdConfigured = environment.googleClientId.trim() !== '';
  readonly sdkReady = signal(false);
  readonly signingIn = signal(false);
  readonly backendError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.auth.currentUser() !== null) {
        void this.router.navigateByUrl(this.getReturnUrl());
      } else if (!this.auth.restoring()) {
        this.ensureSdkLoaded();
      }
    });

    effect(() => {
      const credential = this.googleSignIn.credential();
      if (credential !== null) {
        this.googleSignIn.credential.set(null);
        this.signIn(credential);
      }
    });

    effect(() => {
      const button = this.googleButton()?.nativeElement;
      if (!this.sdkReady() || button === undefined || this.renderedButton === button) {
        return;
      }
      this.renderedButton = button;
      this.googleSignIn.renderButton(button, {
        type: 'standard',
        text: 'continue_with',
        locale: 'es',
        width: 320,
        size: 'large',
      });
    });
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

  private signIn(credential: string): void {
    if (this.signingIn()) {
      return;
    }
    this.backendError.set(null);
    this.signingIn.set(true);
    this.auth.loginWithGoogle(credential).subscribe({
      next: (result) => {
        this.signingIn.set(false);
        if (result.kind === 'registration-required') {
          this.backendError.set(
            'Esta cuenta de Google aún no está registrada. Puedes crearla desde el registro.',
          );
          return;
        }
        void this.router.navigateByUrl(this.getReturnUrl());
      },
      error: (error: unknown) => {
        this.signingIn.set(false);
        this.backendError.set(this.getErrorMessage(error));
      },
    });
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl !== null && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/';
  }

  private getErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
    return 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.';
  }
}
