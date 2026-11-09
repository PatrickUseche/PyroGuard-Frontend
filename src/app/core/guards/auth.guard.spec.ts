import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService, AuthUser } from '../services/auth.service';
import { authGuard, guestGuard, safeReturnUrl } from './auth.guard';

describe('auth guards', () => {
  let currentUser: ReturnType<typeof signal<AuthUser | null>>;
  let restoring: ReturnType<typeof signal<boolean>>;
  let restoreSession: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    currentUser = signal<AuthUser | null>(null);
    restoring = signal(false);
    restoreSession = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser, restoring, restoreSession },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should redirect to login and preserve the requested route when signed out', async () => {
    const result = await runGuard(authGuard, '/alertas/42?filtro=activo');

    expect(router.serializeUrl(expectUrlTree(result))).toBe(
      '/login?returnUrl=%2Falertas%2F42%3Ffiltro%3Dactivo',
    );
    expect(restoreSession).toHaveBeenCalledOnce();
  });

  it('should allow a protected route after a session is restored', async () => {
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });

    await expect(runGuard(authGuard, '/alertas')).resolves.toBe(true);
  });

  it('should wait for session restoration before deciding', async () => {
    restoring.set(true);
    const decision = runGuard(authGuard, '/mapa');
    let resolved = false;
    void decision.then(() => (resolved = true));

    await Promise.resolve();
    expect(resolved).toBe(false);

    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });
    restoring.set(false);

    await expect(decision).resolves.toBe(true);
  });

  it('should redirect signed-in guests to the dashboard', async () => {
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });

    const result = await runGuard(guestGuard, '/login');

    expect(router.serializeUrl(expectUrlTree(result))).toBe('/');
  });

  it('should reject unsafe return URLs', () => {
    expect(safeReturnUrl('//example.com')).toBe('/');
    expect(safeReturnUrl('https://example.com')).toBe('/');
    expect(safeReturnUrl('/alertas')).toBe('/alertas');
  });

  async function runGuard(
    guard: typeof authGuard | typeof guestGuard,
    url: string,
  ): Promise<unknown> {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    if (result instanceof Observable) {
      return firstValueFrom(result);
    }
    return result;
  }

  function expectUrlTree(result: unknown): UrlTree {
    if (!(result instanceof UrlTree)) {
      throw new Error('Se esperaba una redirección del router.');
    }
    return result;
  }
});
