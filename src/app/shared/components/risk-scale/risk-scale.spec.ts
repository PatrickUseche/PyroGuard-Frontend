import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskScale } from './risk-scale';

describe('RiskScale', () => {
  let fixture: ComponentFixture<RiskScale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RiskScale] }).compileComponents();
    fixture = TestBed.createComponent(RiskScale);
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should place a single pointer over the current class', () => {
    fixture.componentRef.setInput('risk', 'WARNING');
    fixture.detectChanges();

    expect(element().querySelectorAll('.pointer').length).toBe(1);
    expect(fixture.componentInstance.pointerPosition()).toBeCloseTo(0.5);
    expect(element().querySelector('.segment.current')?.textContent).toContain('Advertencia');
  });

  it('should hide the pointer when risk is not evaluated', () => {
    fixture.componentRef.setInput('risk', null);
    fixture.detectChanges();

    expect(element().querySelector('.pointer')).toBeNull();
    expect(element().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Riesgo sin evaluar',
    );
  });

  it('should mark the stale mini scale without hiding its label', () => {
    fixture.componentRef.setInput('variant', 'mini');
    fixture.componentRef.setInput('risk', 'FIRE');
    fixture.componentRef.setInput('stale', true);
    fixture.detectChanges();

    expect(element().querySelector('.mini.stale i.current.fire')).not.toBeNull();
    expect(element().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Riesgo incendio, desactualizado',
    );
  });
});
