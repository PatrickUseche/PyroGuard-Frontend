import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_CONFIG_ERROR = 'El acceso con Google no está configurado.';
const GOOGLE_LOAD_ERROR =
  'No se pudo cargar Google. Comprueba tu conexión o si está bloqueado e inténtalo de nuevo.';

@Injectable({ providedIn: 'root' })
export class GoogleSignInService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly clientId = environment.googleClientId;
  private loadingPromise: Promise<void> | null = null;
  private initialized = false;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly credential = signal<string | null>(null);

  async load(): Promise<void> {
    if (this.clientId.trim() === '') {
      this.error.set(GOOGLE_CONFIG_ERROR);
      return;
    }

    if (!isPlatformBrowser(this.platformId) || this.initialized) {
      return;
    }

    if (this.loadingPromise !== null) {
      await this.loadingPromise;
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    const attempt = (this.document.defaultView?.google ? Promise.resolve() : this.loadScript())
      .then(() => {
        const identity = this.document.defaultView?.google?.accounts.id;
        if (identity === undefined) {
          throw new Error('Google Identity Services no quedó disponible.');
        }

        identity.initialize({
          client_id: this.clientId,
          auto_select: false,
          callback: (response) => this.credential.set(response.credential),
        });
        this.initialized = true;
      })
      .catch(() => {
        this.error.set(GOOGLE_LOAD_ERROR);
      })
      .finally(() => {
        this.loading.set(false);
        if (!this.initialized) {
          this.loadingPromise = null;
        }
      });

    this.loadingPromise = attempt;
    await attempt;
  }

  renderButton(
    parent: HTMLElement,
    configuration: google.accounts.id.GsiButtonConfiguration,
  ): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const identity = this.document.defaultView?.google?.accounts.id;
    if (!this.initialized || identity === undefined) {
      this.error.set(GOOGLE_LOAD_ERROR);
      return;
    }

    identity.renderButton(parent, configuration);
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset['pyroguardGoogleIdentity'] = 'true';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener(
        'error',
        () => {
          script.remove();
          reject(new Error('No se pudo cargar Google Identity Services.'));
        },
        { once: true },
      );
      this.document.head.append(script);
    });
  }
}
