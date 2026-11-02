import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { isSimulatedNode } from '../../utils/simulated-node.util';

@Component({
  selector: 'app-simulated-badge',
  standalone: true,
  template: `
    @if (simulated()) {
      <span class="simulated-badge" aria-label="Nodo simulado">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M9 3h6m-5 0v6.2l-4.1 7.1A3.1 3.1 0 0 0 8.6 21h6.8a3.1 3.1 0 0 0 2.7-4.7L14 9.2V3m-5.8 11h7.6"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
        Simulado
      </span>
    }
  `,
  styles: `
    .simulated-badge {
      display: inline-flex;
      width: fit-content;
      min-height: 28px;
      align-items: center;
      gap: var(--space-1);
      padding: 2px var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface-muted);
      color: var(--color-text);
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }

    svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatedBadge {
  readonly nodeId = input.required<string>();
  readonly simulated = computed(() => isSimulatedNode(this.nodeId()));
}
