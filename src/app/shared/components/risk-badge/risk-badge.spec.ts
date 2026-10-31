import { TestBed } from '@angular/core/testing';
import { RiskBadge } from './risk-badge';

describe('RiskBadge', () => {
  it('should render a textual risk label with an SVG icon', async () => {
    await TestBed.configureTestingModule({ imports: [RiskBadge] }).compileComponents();
    const fixture = TestBed.createComponent(RiskBadge);
    fixture.componentRef.setInput('risk', 'FIRE');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(badge.textContent).toContain('Incendio');
    expect(badge.querySelector('svg')).toBeTruthy();
    expect(badge.getAttribute('aria-label')).toBe('Riesgo incendio');
  });

  it.each([
    { risk: 'NORMAL' as const, label: 'Normal' },
    { risk: 'WARNING' as const, label: 'Advertencia' },
    { risk: 'FIRE' as const, label: 'Incendio' },
  ])('should render the $label risk label and icon', async ({ risk, label }) => {
    await TestBed.configureTestingModule({ imports: [RiskBadge] }).compileComponents();
    const fixture = TestBed.createComponent(RiskBadge);
    fixture.componentRef.setInput('risk', risk);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(badge.textContent).toContain(label);
    expect(badge.querySelector('svg')).toBeTruthy();
  });

  it('should present offline risk as stale instead of normal', async () => {
    await TestBed.configureTestingModule({ imports: [RiskBadge] }).compileComponents();
    const fixture = TestBed.createComponent(RiskBadge);
    fixture.componentRef.setInput('risk', 'NORMAL');
    fixture.componentRef.setInput('stale', true);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(badge.textContent).toContain('Desactualizado');
    expect(badge.getAttribute('aria-label')).toContain('desactualizado');
  });
});
