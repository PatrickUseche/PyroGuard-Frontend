import { TestBed } from '@angular/core/testing';
import { ConnectionBadge } from './connection-badge';

describe('ConnectionBadge', () => {
  it('should display an accessible connection label and icon', async () => {
    await TestBed.configureTestingModule({ imports: [ConnectionBadge] }).compileComponents();
    const fixture = TestBed.createComponent(ConnectionBadge);
    fixture.componentRef.setInput('status', 'UNKNOWN');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(badge.textContent).toContain('Desconocido');
    expect(badge.querySelector('svg')).toBeTruthy();
    expect(badge.getAttribute('aria-label')).toBe('Conexión desconocido');
  });
});
