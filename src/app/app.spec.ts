import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { guestGuard } from './core/guards/auth.guard';
import { RegistrationPage } from './features/auth/registration-page';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should lazy-load the registration page behind the guest guard', async () => {
    const layout = routes.find((route) => route.path === '');
    const registration = layout?.children?.find((route) => route.path === 'registro');

    expect(registration?.canActivate).toEqual([guestGuard]);
    expect(registration?.data).toEqual({ layout: 'authentication' });
    expect(await registration?.loadComponent?.()).toBe(RegistrationPage);
  });
});
