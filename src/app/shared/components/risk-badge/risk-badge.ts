import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RISK_LABELS, Risk } from '../../models/risk.model';

@Component({
  selector: 'app-risk-badge',
  standalone: true,
  template: `
    @if (stale()) {
      <span class="badge stale" role="status" [attr.aria-label]="ariaLabel()">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        Desactualizado
      </span>
    } @else if (risk(); as currentRisk) {
      <span class="badge" [class]="currentRisk.toLowerCase()" role="status" [attr.aria-label]="ariaLabel()">
        @switch (currentRisk) {
          @case ('NORMAL') {
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Zm-3.5 9 2.3 2.3 4.8-5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          }
          @case ('WARNING') {
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          }
          @case ('FIRE') {
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12.4 2.5c.6 3.5-2.9 4.7-2.9 8.1-1.1-.7-1.8-1.8-2-3.1C4.8 10 4 12.1 4 14.3a8 8 0 0 0 16 0c0-4.1-2.6-8.5-7.6-11.8Zm-.5 17.1a3.3 3.3 0 0 1-3.3-3.3c0-1.2.6-2.2 1.8-3.2.3 1.3 1.1 1.8 1.7 2.2.6-.9.9-1.7.8-2.7 1.5 1.2 2.3 2.5 2.3 3.8a3.3 3.3 0 0 1-3.3 3.2Z"
                fill="currentColor"
              />
            </svg>
          }
        }
        {{ riskLabel() }}
      </span>
    } @else {
      <span class="badge unevaluated" role="status" aria-label="Riesgo sin evaluar">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 11v5m0-8v.1" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
        </svg>
        Sin evaluar
      </span>
    }
  `,
  styles: `
    .badge {
      display: inline-flex;
      min-height: 28px;
      align-items: center;
      gap: var(--space-1);
      padding: 3px var(--space-2);
      border: 1px solid transparent;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }

    .normal {
      border-color: var(--risk-normal-border);
      background: var(--risk-normal-bg);
      color: var(--risk-normal-text);
    }

    .warning {
      border-color: var(--risk-warning-border);
      background: var(--risk-warning-bg);
      color: var(--risk-warning-text);
    }

    .fire {
      border-color: var(--risk-fire-border);
      background: var(--risk-fire-bg);
      color: var(--risk-fire-text);
    }

    .stale,
    .unevaluated {
      border-color: var(--color-border);
      background: var(--color-surface-muted);
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskBadge {
  readonly risk = input<Risk | null>(null);
  readonly stale = input(false);

  readonly riskLabel = computed(() => {
    const risk = this.risk();
    return risk === null ? 'Sin evaluar' : RISK_LABELS[risk];
  });

  readonly ariaLabel = computed(() => {
    if (this.stale()) {
      return `Riesgo ${this.riskLabel().toLowerCase()}, desactualizado`;
    }
    return `Riesgo ${this.riskLabel().toLowerCase()}`;
  });
}
