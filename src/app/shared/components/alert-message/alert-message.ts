import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parseAlertMessage } from '../../utils/alert-message.util';

@Component({
  selector: 'app-alert-message',
  standalone: true,
  template: `
    <p class="summary">{{ parsed().summary }}</p>
    @if (parsed().reasons.length > 0) {
      <ul class="reasons" aria-label="Razones de la alerta">
        @for (reason of parsed().reasons; track reason) {
          <li>{{ reason }}</li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .summary {
      margin: 0;
      font-weight: 650;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .reasons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .reasons li {
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-control);
      background: var(--color-surface-muted);
      color: var(--color-text);
      font-size: 0.85rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertMessage {
  readonly message = input.required<string>();
  readonly parsed = computed(() => parseAlertMessage(this.message()));
}
