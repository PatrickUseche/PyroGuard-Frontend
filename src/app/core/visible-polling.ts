import {
  EMPTY,
  Observable,
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  exhaustMap,
  fromEvent,
  map,
  merge,
  of,
  switchMap,
  timer,
} from 'rxjs';
import { ApiError } from '../shared/models/api-error.model';

export type VisiblePollResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export function createVisiblePolling<T>(
  intervalMs: number,
  poll: () => Observable<T>,
): Observable<VisiblePollResult<T>> {
  if (typeof document === 'undefined') {
    return EMPTY;
  }

  let retryAt = 0;
  const visibilityChanges = fromEvent(document, 'visibilitychange').pipe(
    map(() => document.hidden),
  );

  return merge(of(document.hidden), visibilityChanges).pipe(
    distinctUntilChanged(),
    switchMap((hidden) =>
      hidden
        ? EMPTY
        : concat(of(undefined), timer(intervalMs, intervalMs)).pipe(
            exhaustMap(() => {
              if (Date.now() < retryAt) {
                return EMPTY;
              }
              const execute = () =>
                defer(poll).pipe(
                  map((value): VisiblePollResult<T> => ({ ok: true, value })),
                  catchError((error: unknown) => {
                    if (isThrottledError(error)) {
                      retryAt = Math.max(
                        retryAt,
                        Date.now() + (error.retryAfter ?? 60) * 1000,
                      );
                    }
                    return of<VisiblePollResult<T>>({ ok: false, error });
                  }),
                );
              return execute();
            }),
          ),
    ),
  );
}

function isThrottledError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'throttled'
  );
}
