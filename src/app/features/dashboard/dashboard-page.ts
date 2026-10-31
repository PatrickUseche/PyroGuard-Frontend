import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  template: `
    <section aria-labelledby="dashboard-title">
      <p class="eyebrow">Monitoreo forestal</p>
      <h1 id="dashboard-title">Centro de control</h1>
      <p class="intro">Estado de nodos, lecturas recientes y alertas de PyroGuard.</p>
    </section>
  `,
  styles: `
    .eyebrow {
      margin: 0 0 var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.7rem, 3vw, 2.25rem);
    }

    .intro {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
