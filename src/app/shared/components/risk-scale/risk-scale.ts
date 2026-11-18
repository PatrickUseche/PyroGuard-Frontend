import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RISK_LABELS, Risk } from '../../models/risk.model';

interface ScaleClass {
  readonly risk: Risk;
  readonly label: string;
  readonly description: string;
}

const CLASSES: readonly ScaleClass[] = [
  {
    risk: 'NORMAL',
    label: RISK_LABELS.NORMAL,
    description: 'El sistema no identifica condiciones de riesgo elevado.',
  },
  {
    risk: 'WARNING',
    label: RISK_LABELS.WARNING,
    description: 'El sistema detecta condiciones que requieren atención.',
  },
  {
    risk: 'FIRE',
    label: RISK_LABELS.FIRE,
    description: 'El sistema determina un riesgo de incendio.',
  },
];

/**
 * Escala de tres clases de peligro con puntero, como un cartel de carretera.
 * `band` es la banda grande del resumen; `mini` es la marca por nodo.
 * El estado se lee por posición y forma, no solo por color.
 */
@Component({
  selector: 'app-risk-scale',
  standalone: true,
  template: `
    @if (variant() === 'band') {
      <div class="band" role="img" [attr.aria-label]="ariaLabel()">
        @for (item of classes; track item.risk) {
          <div
            class="segment"
            [class]="item.risk.toLowerCase()"
            [class.current]="item.risk === risk()"
          >
            @if (item.risk === risk()) {
              <span class="pointer" aria-hidden="true"></span>
            }
            <span class="segment-label">{{ item.label }}</span>
            <span class="segment-text">{{ item.description }}</span>
          </div>
        }
      </div>
    } @else {
      <div class="mini" role="img" [attr.aria-label]="ariaLabel()" [class.stale]="stale()">
        @for (item of classes; track item.risk) {
          <i [class]="item.risk.toLowerCase()" [class.current]="item.risk === risk()"></i>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .band {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      padding: 14px;
      background: #111915;
    }

    .segment {
      position: relative;
      display: grid;
      align-content: center;
      gap: var(--space-1);
      min-height: 96px;
      padding: var(--space-3) var(--space-4);
      color: #ffffff;
      opacity: 0.38;
    }

    .segment.current {
      opacity: 1;
    }

    .segment.normal {
      background: var(--class-normal);
      color: var(--class-on-normal);
    }

    .segment.warning {
      background: var(--class-warning);
      color: var(--class-on-warning);
    }

    .segment.fire {
      background: var(--class-fire);
      color: var(--class-on-fire);
    }

    .segment-label {
      font-family: var(--font-display);
      font-size: clamp(1.1rem, 2.4vw, 1.9rem);
      font-weight: 800;
      letter-spacing: 0.06em;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .segment-text {
      font-size: 0.85rem;
      line-height: 1.35;
    }

    .pointer {
      position: absolute;
      top: -14px;
      left: 50%;
      width: 0;
      height: 0;
      border-top: 14px solid #ffffff;
      border-right: 12px solid transparent;
      border-left: 12px solid transparent;
      transform: translateX(-50%);
    }

    .mini {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      align-items: end;
      gap: 2px;
      height: 22px;
    }

    .mini i {
      height: 10px;
      background: var(--color-surface-muted);
    }

    .mini i.current {
      height: 22px;
    }

    .mini i.current.normal {
      background: var(--class-normal);
    }

    .mini i.current.warning {
      background: var(--class-warning);
    }

    .mini i.current.fire {
      background: var(--class-fire);
    }

    .mini.stale i.current {
      border: 2px dashed var(--color-text-muted);
      background: transparent;
    }

    @media (max-width: 640px) {
      .band {
        gap: 4px;
        padding: 10px;
      }

      .segment {
        min-height: 72px;
        padding: var(--space-2) var(--space-3);
      }

      .segment-text {
        display: none;
      }

      .segment-label {
        font-size: 0.95rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskScale {
  readonly risk = input<Risk | null>(null);
  readonly variant = input<'band' | 'mini'>('band');
  readonly stale = input(false);
  readonly classes = CLASSES;

  readonly ariaLabel = computed(() => {
    const risk = this.risk();
    if (risk === null) {
      return 'Riesgo sin evaluar';
    }
    const base = `Riesgo ${RISK_LABELS[risk].toLowerCase()}`;
    return this.stale() ? `${base}, desactualizado` : base;
  });
}
