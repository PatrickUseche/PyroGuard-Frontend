import { TestBed } from '@angular/core/testing';
import { StateMessage } from './state-message';

describe('StateMessage', () => {
  it('should render a loading message with a status role', async () => {
    await TestBed.configureTestingModule({ imports: [StateMessage] }).compileComponents();
    const fixture = TestBed.createComponent(StateMessage);
    fixture.componentRef.setInput('kind', 'loading');
    fixture.componentRef.setInput('title', 'Cargando');
    fixture.componentRef.setInput('message', 'Consultando el servicio.');
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(message.textContent).toContain('Consultando el servicio.');
    expect(message.getAttribute('aria-busy')).toBe('true');
  });

  it('should expose errors as alerts', async () => {
    await TestBed.configureTestingModule({ imports: [StateMessage] }).compileComponents();
    const fixture = TestBed.createComponent(StateMessage);
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('title', 'Error');
    fixture.componentRef.setInput('message', 'No se pudo conectar.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
