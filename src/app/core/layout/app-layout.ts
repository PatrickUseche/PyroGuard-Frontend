import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HealthIndicator } from './health-indicator';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HealthIndicator, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="site-header">
        <a class="brand" routerLink="/" aria-label="PyroGuard, inicio">
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12.4 2.5c.6 3.5-2.9 4.7-2.9 8.1-1.1-.7-1.8-1.8-2-3.1C4.8 10 4 12.1 4 14.3a8 8 0 0 0 16 0c0-4.1-2.6-8.5-7.6-11.8Zm-.5 17.1a3.3 3.3 0 0 1-3.3-3.3c0-1.2.6-2.2 1.8-3.2.3 1.3 1.1 1.8 1.7 2.2.6-.9.9-1.7.8-2.7 1.5 1.2 2.3 2.5 2.3 3.8a3.3 3.3 0 0 1-3.3 3.2Z"
              fill="currentColor"
            />
          </svg>
          <span>PyroGuard</span>
        </a>
        <nav class="primary-nav" aria-label="Navegación principal">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
          >
            Resumen
          </a>
          <a routerLink="/alertas" routerLinkActive="active" ariaCurrentWhenActive="page">
            Alertas
          </a>
          <a routerLink="/mapa" routerLinkActive="active" ariaCurrentWhenActive="page"> Mapa </a>
        </nav>
        <app-health-indicator class="health-indicator" />
        @if (auth.isAuthenticated()) {
          <button type="button" class="auth-button" (click)="logout()">Cerrar sesión</button>
        } @else {
          <a class="auth-button" routerLink="/login">Iniciar sesión</a>
        }
      </header>

      <main id="main-content" class="main-content">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <p>Prototipo académico con datos sintéticos; no es un detector certificado de incendios.</p>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-shell {
      display: flex;
      min-height: 100vh;
      flex-direction: column;
    }

    .site-header {
      display: flex;
      min-height: 68px;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-3) max(var(--space-6), calc((100vw - 1200px) / 2));
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .brand {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text);
      font-size: 1.15rem;
      font-weight: 750;
      text-decoration: none;
    }

    .brand-icon {
      width: 28px;
      height: 28px;
      color: var(--risk-fire-text);
    }

    .primary-nav {
      display: flex;
      align-self: stretch;
      gap: var(--space-2);
    }

    .primary-nav a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      padding: 0 var(--space-3);
      border-bottom: 3px solid transparent;
      color: var(--color-text-muted);
      font-weight: 600;
      text-decoration: none;
    }

    .primary-nav a.active {
      border-bottom-color: var(--color-focus);
      color: var(--color-text);
    }

    .health-indicator {
      margin-left: auto;
    }

    .auth-button {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-weight: 650;
      text-decoration: none;
      white-space: nowrap;
    }

    .main-content {
      width: min(1200px, 100%);
      flex: 1;
      align-self: center;
      padding: var(--space-8) var(--space-6);
    }

    .site-footer {
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-muted);
      text-align: center;
    }

    .site-footer p {
      margin: 0;
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      .site-header {
        flex-wrap: wrap;
        min-height: 60px;
        gap: var(--space-4);
        padding: var(--space-2) var(--space-4);
      }

      .health-indicator {
        margin-left: auto;
      }

      .main-content {
        padding: var(--space-6) var(--space-4);
      }

      .site-footer {
        padding: var(--space-4);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.auth.restoreSession();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
