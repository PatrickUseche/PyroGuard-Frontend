import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GoogleSignInService } from './google-sign-in.service';

describe('GoogleSignInService', () => {
  const originalClientId = environment.googleClientId;

  beforeEach(() => {
    environment.googleClientId = 'test-client-id';
    expect(Reflect.deleteProperty(window, 'google')).toBe(true);
    document
      .querySelectorAll('script[data-pyroguard-google-identity]')
      .forEach((script) => script.remove());
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
  });

  afterEach(() => {
    environment.googleClientId = originalClientId;
    expect(Reflect.deleteProperty(window, 'google')).toBe(true);
    document
      .querySelectorAll('script[data-pyroguard-google-identity]')
      .forEach((script) => script.remove());
  });

  it('should load the SDK once, initialize it, and expose its credential', async () => {
    const service = TestBed.inject(GoogleSignInService);
    const firstLoad = service.load();
    const secondLoad = service.load();

    const script = getGoogleScript();
    expect(script.src).toBe('https://accounts.google.com/gsi/client');
    expect(script.async).toBe(true);
    expect(script.defer).toBe(true);
    expect(document.querySelectorAll('script[data-pyroguard-google-identity]')).toHaveLength(1);

    const sdk = installGoogleSdk();
    script.dispatchEvent(new Event('load'));
    await Promise.all([firstLoad, secondLoad]);

    expect(sdk.initialize).toHaveBeenCalledOnce();
    expect(sdk.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id', auto_select: false }),
    );
    const configuration = sdk.initialize.mock.calls[0]?.[0];
    configuration?.callback({ credential: 'google-credential' });
    expect(service.credential()).toBe('google-credential');
    expect(service.error()).toBeNull();
  });

  it('should expose a load error and allow retrying', async () => {
    const service = TestBed.inject(GoogleSignInService);
    const failedLoad = service.load();
    getGoogleScript().dispatchEvent(new Event('error'));
    await failedLoad;

    expect(service.error()).toContain('No se pudo cargar Google.');
    expect(service.loading()).toBe(false);

    const retriedLoad = service.load();
    const script = getGoogleScript();
    const sdk = installGoogleSdk();
    script.dispatchEvent(new Event('load'));
    await retriedLoad;

    expect(service.error()).toBeNull();
    expect(sdk.initialize).toHaveBeenCalledOnce();
  });

  it('should not load the SDK without a configured client ID', async () => {
    environment.googleClientId = '';
    const service = TestBed.inject(GoogleSignInService);

    await service.load();

    expect(document.querySelector('script[data-pyroguard-google-identity]')).toBeNull();
    expect(service.error()).toBe('El acceso con Google no está configurado.');
  });

  it('should not load the SDK outside the browser', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(GoogleSignInService);

    await service.load();

    expect(document.querySelector('script[data-pyroguard-google-identity]')).toBeNull();
  });

  function getGoogleScript(): HTMLScriptElement {
    const script = document.querySelector<HTMLScriptElement>(
      'script[data-pyroguard-google-identity]',
    );
    if (script === null) {
      throw new Error('No se encontró el script de Google.');
    }
    return script;
  }

  function installGoogleSdk(): {
    initialize: ReturnType<
      typeof vi.fn<(configuration: google.accounts.id.IdConfiguration) => void>
    >;
  } {
    const initialize = vi.fn<(configuration: google.accounts.id.IdConfiguration) => void>();
    const renderButton =
      vi.fn<
        (parent: HTMLElement, configuration: google.accounts.id.GsiButtonConfiguration) => void
      >();

    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
          cancel: vi.fn(),
          disableAutoSelect: vi.fn(),
        },
      },
    };

    return { initialize };
  }
});
