import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './core/config/api-base-url.token';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(),
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    provideZoneChangeDetection({ eventCoalescing: true }),
  ]
};