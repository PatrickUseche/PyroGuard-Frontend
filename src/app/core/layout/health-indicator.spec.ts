import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { HealthService } from '../services/health.service';
import { DashboardStore } from '../../features/dashboard/dashboard-store';
import { HealthIndicator } from './health-indicator';

describe('HealthIndicator', () => {
  it('should use the latest successful dashboard cycle as a fallback', async () => {
    await TestBed.configureTestingModule({
      imports: [HealthIndicator],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: HealthService, useValue: { check: () => { throw new Error('not called'); } } },
        {
          provide: DashboardStore,
          useValue: { lastUpdated: signal(new Date()) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HealthIndicator);
    fixture.detectChanges();

    const indicator = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(indicator.textContent).toContain('Disponible');
    expect(indicator.getAttribute('aria-label')).toContain('último ciclo exitoso');
  });
});
