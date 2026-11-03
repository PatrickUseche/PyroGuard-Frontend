import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../shared/models/api-error.model';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, StateMessage],
  template: `
    <section class="login-panel" aria-labelledby="login-title">
      <header>
        <p class="eyebrow">Acceso de operación</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <p>
          La consulta de lecturas permanece pública. Inicia sesión para habilitar acciones sobre
          alertas.
        </p>
      </header>

      @if (error(); as message) {
        <app-state-message kind="error" title="No se pudo iniciar sesión" [message]="message" />
      }

      <form (ngSubmit)="submit()" #loginForm="ngForm">
        <label for="username">Usuario</label>
        <input
          id="username"
          name="username"
          autocomplete="username"
          required
          [(ngModel)]="username"
        />

        <label for="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          [(ngModel)]="password"
        />

        <button type="submit" [disabled]="loading() || loginForm.invalid">
          {{ loading() ? 'Iniciando sesión…' : 'Iniciar sesión' }}
        </button>
      </form>
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

    form {
      display: grid;
      gap: var(--space-2);
    }

    label {
      margin-top: var(--space-2);
      font-weight: 650;
    }

    input,
    button {
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
    }

    button {
      margin-top: var(--space-3);
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-on-primary);
      cursor: pointer;
      font-weight: 700;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.loading() || this.username.trim() === '' || this.password === '') {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.authService.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.error.set(error.message);
      },
    });
  }
}
