import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  it('should log in and navigate to the dashboard', async () => {
    const login = vi.fn(() => of(undefined));
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.username = 'operator';
    fixture.componentInstance.password = 'secret';
    fixture.componentInstance.submit();

    expect(login).toHaveBeenCalledWith('operator', 'secret');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('should display the backend non-field error', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            login: () =>
              throwError(() => ({
                kind: 'unknown',
                message: 'Nombre de usuario o contraseña incorrectos.',
              })),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.username = 'operator';
    fixture.componentInstance.password = 'wrong';
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nombre de usuario o contraseña incorrectos.',
    );
  });
});
