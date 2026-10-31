import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CONNECTION_STATUS_LABELS,
  ConnectionStatus,
} from '../../models/connection-status.model';

@Component({
  selector: 'app-connection-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="status().toLowerCase()" role="status" [attr.aria-label]="ariaLabel()">
      @switch (status()) {
        @case ('ONLINE') {
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="m8.5 12 2.3 2.3 4.7-4.8"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        }
        @case ('OFFLINE') {
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M5 9a11 11 0 0 1 14 0M8 12a6.5 6.5 0 0 1 8 0m-5.3 3.1a2.1 2.1 0 0 1 2.6 0M4 4l16 16"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        }
        @case ('UNKNOWN') {
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.7c-1.2 1-1.6 1.3-1.6 2.8m0 3v.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
          </svg>
        }
      }
      {{ label() }}
    </span>
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

    .online {
      border-color: var(--risk-normal-border);
      background: var(--status-online-bg);
      color: var(--status-online-text);
    }

    .offline {
      border-color: var(--color-border);
      background: var(--status-offline-bg);
      color: var(--status-offline-text);
    }

    .unknown {
      border-color: var(--color-border);
      background: var(--status-unknown-bg);
      color: var(--status-unknown-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionBadge {
  readonly status = input.required<ConnectionStatus>();
  readonly label = computed(() => CONNECTION_STATUS_LABELS[this.status()]);
  readonly ariaLabel = computed(() => `Conexión ${this.label().toLowerCase()}`);
}
