import { Observable, Subject, of, throwError } from 'rxjs';
import { createVisiblePolling } from './visible-polling';

describe('createVisiblePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should poll immediately and then at the configured interval', async () => {
    const poll = vi.fn(() => of('ok'));
    createVisiblePolling(1_000, poll).subscribe();

    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('should pause while hidden and resume with an immediate poll', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const poll = vi.fn(() => of('ok'));
    createVisiblePolling(1_000, poll).subscribe();

    expect(poll).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('should not overlap an unfinished poll', async () => {
    const pending = new Subject<string>();
    const poll: () => Observable<string> = vi
      .fn()
      .mockReturnValueOnce(pending)
      .mockReturnValue(of('next'));
    createVisiblePolling(1_000, poll).subscribe();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(poll).toHaveBeenCalledTimes(1);

    pending.next('first');
    pending.complete();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('should wait for Retry-After before polling again after a 429', async () => {
    const poll = vi
      .fn<() => Observable<string>>()
      .mockReturnValueOnce(
        throwError(() => ({
          kind: 'throttled',
          message: 'Throttled',
          retryAfter: 5,
        })),
      )
      .mockReturnValue(of('ok'));
    createVisiblePolling(1_000, poll).subscribe();

    await vi.advanceTimersByTimeAsync(4_999);
    expect(poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
  });
});
