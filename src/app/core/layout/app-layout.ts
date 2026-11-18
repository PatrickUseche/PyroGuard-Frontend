import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { HealthIndicator } from './health-indicator';
import { AuthService } from '../services/auth.service';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injector, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { DashboardStore } from '../../features/dashboard/dashboard-store';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HealthIndicator, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell" [class.with-rail]="showNavigation()">
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
        @if (showNavigation()) {
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
          <div class="health-plate"><app-health-indicator class="health-indicator" /></div>
        }
        @if (!authenticationPage()) {
          @if (auth.currentUser(); as user) {
            <span class="auth-user">{{ '@' + user.username }}</span>
            <button type="button" class="auth-button" (click)="logout()">Cerrar sesión</button>
          } @else if (auth.restoring()) {
            <span class="auth-user" role="status">Comprobando sesión</span>
          } @else {
            <a class="auth-button" routerLink="/login">Iniciar sesión</a>
          }
          @if (auth.authError(); as message) {
            <span class="auth-user" role="status">{{ message }}</span>
          }
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
      display: grid;
      min-height: 100vh;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto 1fr auto;
    }

    .site-header {
      display: flex;
      min-height: 64px;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3) var(--space-6);
      padding: var(--space-2) var(--space-4);
      background: var(--color-rail);
      color: var(--color-on-rail);
    }

    .site-header :focus-visible {
      outline-color: var(--color-on-rail);
    }

    .brand {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-on-rail);
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .brand-icon {
      width: 28px;
      height: 28px;
      color: var(--class-warning);
    }

    .primary-nav {
      display: flex;
      gap: var(--space-1);
    }

    .primary-nav a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      padding: 0 var(--space-3);
      border-bottom: 4px solid transparent;
      color: var(--color-on-rail);
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 600;
      text-decoration: none;
    }

    .primary-nav a:hover {
      background: rgb(255 255 255 / 12%);
    }

    .primary-nav a.active {
      border-bottom-color: var(--class-warning);
      font-weight: 800;
    }

    .health-plate {
      margin-left: auto;
      padding: 0 var(--space-2);
      background: var(--color-surface);
    }

    .auth-button {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-3);
      border: 2px solid var(--color-on-rail);
      border-radius: var(--radius-control);
      background: transparent;
      color: var(--color-on-rail);
      cursor: pointer;
      font-weight: 650;
      text-decoration: none;
      white-space: nowrap;
    }

    .auth-button:hover {
      background: var(--color-on-rail);
      color: var(--color-rail);
    }

    .auth-user {
      max-width: 220px;
      overflow: hidden;
      color: var(--color-on-rail);
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .main-content {
      width: min(1200px, 100%);
      align-self: start;
      justify-self: center;
      padding: var(--space-8) var(--space-6);
    }

    .site-footer {
      padding: var(--space-3) var(--space-6);
      border-top: 2px solid var(--color-ink);
      background: var(--color-surface);
      color: var(--color-text-muted);
    }

    .site-footer p {
      margin: 0;
      font-size: 0.875rem;
    }

    @media (min-width: 960px) {
      .app-shell.with-rail {
        grid-template-columns: 240px minmax(0, 1fr);
        grid-template-rows: 1fr auto;
      }

      .with-rail .site-header {
        position: sticky;
        top: 0;
        height: 100vh;
        grid-row: 1 / span 2;
        align-content: start;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: var(--space-4);
        padding: var(--space-6) var(--space-4);
      }

      .with-rail .primary-nav {
        flex-direction: column;
      }

      .with-rail .primary-nav a {
        padding: 0 var(--space-3);
        border-bottom: 0;
        box-shadow: inset 4px 0 0 transparent;
      }

      .with-rail .primary-nav a.active {
        background: var(--color-on-rail);
        box-shadow: none;
        color: var(--color-rail);
      }

      .with-rail .health-plate {
        margin: 0;
        padding: var(--space-1) var(--space-2);
      }

      .with-rail .auth-user {
        max-width: none;
      }

      .with-rail .auth-user:first-of-type {
        margin-top: auto;
      }
    }

    @media (max-width: 640px) {
      .site-header {
        gap: var(--space-1) var(--space-3);
      }

      .primary-nav {
        order: 3;
        width: 100%;
        overflow-x: auto;
      }

      .auth-user {
        max-width: 140px;
        font-size: 0.9rem;
      }

      .health-plate {
        margin-left: auto;
      }

      .main-content {
        padding: var(--space-6) var(--space-4);
      }

      .site-footer {
        padding: var(--space-3) var(--space-4);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly authenticationPage = signal(false);
  readonly showNavigation = computed(
    () => !this.authenticationPage() && this.auth.currentUser() !== null,
  );

  private readonly injector = inject(Injector);
  private readonly body = inject(DOCUMENT).body;

  constructor() {
    // El riesgo global tiñe el riel en todas las rutas con sesión (ver `body[data-risk]` en styles.css).
    // El store se crea solo con sesión para no consultar la API en el login.
    effect(() => {
      const risk = this.showNavigation()
        ? this.injector.get(DashboardStore).summary()?.overall_risk
        : undefined;
      if (risk === 'FIRE' || risk === 'WARNING') {
        this.body.dataset['risk'] = risk;
      } else {
        delete this.body.dataset['risk'];
      }
    });
    this.destroyRef.onDestroy(() => delete this.body.dataset['risk']);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.updateLayoutMode());
  }

  ngOnInit(): void {
    this.auth.restoreSession();
  }

  private updateLayoutMode(): void {
    let activeRoute = this.route.snapshot;
    while (activeRoute.firstChild !== null) {
      activeRoute = activeRoute.firstChild;
    }
    this.authenticationPage.set(activeRoute.data['layout'] === 'authentication');
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
