import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StateMessageKind = 'loading' | 'error' | 'empty';

@Component({
  selector: 'app-state-message',
  standalone: true,
  template: `
    <section
      class="state-message"
      [class]="kind()"
      [attr.role]="role()"
      aria-live="polite"
      [attr.aria-busy]="kind() === 'loading'"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        @switch (kind()) {
          @case ('loading') {
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="2" />
          }
          @case ('error') {
            <path
              d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          }
          @case ('empty') {
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="m7 14 3-3 3 3 2-2 3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
          }
        }
      </svg>
      <div>
        <h3>{{ title() }}</h3>
        <p>{{ message() }}</p>
      </div>
    </section>
  `,
  styles: `
    .state-message {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
      color: var(--color-text-muted);
    }

    .state-message.error {
      border-style: solid;
      border-color: var(--risk-fire-border);
      color: var(--risk-fire-text);
    }

    .state-message.loading svg {
      animation: state-spin 1.2s linear infinite;
    }

    svg {
      width: 22px;
      height: 22px;
      flex: 0 0 22px;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      color: var(--color-text);
      font-size: 0.95rem;
    }

    p {
      margin-top: var(--space-1);
      line-height: 1.5;
    }

    @keyframes state-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .state-message.loading svg {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateMessage {
  readonly kind = input.required<StateMessageKind>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly role = computed(() => (this.kind() === 'error' ? 'alert' : 'status'));
}
