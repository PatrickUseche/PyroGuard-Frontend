import { TestBed } from '@angular/core/testing';
import { SimulatedBadge } from './simulated-badge';

describe('SimulatedBadge', () => {
  it('should show an icon and text for a simulated node', async () => {
    await TestBed.configureTestingModule({ imports: [SimulatedBadge] }).compileComponents();
    const fixture = TestBed.createComponent(SimulatedBadge);
    fixture.componentRef.setInput('nodeId', 'SIM-001');
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.simulated-badge');
    expect(badge?.textContent).toContain('Simulado');
    expect(badge?.getAttribute('aria-label')).toBe('Nodo simulado');
    expect(badge?.querySelector('svg')).not.toBeNull();
  });

  it('should not render for a regular node', async () => {
    await TestBed.configureTestingModule({ imports: [SimulatedBadge] }).compileComponents();
    const fixture = TestBed.createComponent(SimulatedBadge);
    fixture.componentRef.setInput('nodeId', 'NODE-001');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.simulated-badge')).toBeNull();
  });
});
