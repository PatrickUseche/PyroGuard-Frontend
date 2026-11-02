import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api-base-url.token';
import { apiErrorInterceptor } from '../../core/interceptors/api-error.interceptor';
import { DashboardStore } from './dashboard-store';

describe('DashboardStore', () => {
  let store: DashboardStore;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(DashboardStore);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    vi.useRealTimers();
  });

  it('should fetch summary, nodes, and active alerts in a single cycle', () => {
    const summaryRequest = httpTestingController.expectOne(
      'https://api.test/api/dashboard/summary/',
    );
    const nodesRequest = httpTestingController.expectOne('https://api.test/api/nodes/');
    const alertsRequest = httpTestingController.expectOne('https://api.test/api/alerts/active/');

    summaryRequest.flush({
      total_nodes: 1,
      nodes_online: 1,
      nodes_offline: 0,
      nodes_unknown: 0,
      nodes_at_risk: 0,
      active_alerts: 0,
      overall_risk: 'NORMAL',
      latest_readings: [],
    });
    nodesRequest.flush([]);
    alertsRequest.flush([]);

    expect(store.summary()?.total_nodes).toBe(1);
    expect(store.nodes()).toEqual([]);
    expect(store.alerts()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.lastUpdated()).toBeInstanceOf(Date);
  });

  it('should retain successful data and expose translated partial errors', () => {
    httpTestingController
      .expectOne('https://api.test/api/dashboard/summary/')
      .flush({
        total_nodes: 0,
        nodes_online: 0,
        nodes_offline: 0,
        nodes_unknown: 0,
        nodes_at_risk: 0,
        active_alerts: 0,
        overall_risk: 'NORMAL',
        latest_readings: [],
      });
    httpTestingController
      .expectOne('https://api.test/api/nodes/')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    httpTestingController.expectOne('https://api.test/api/alerts/active/').flush([]);

    expect(store.error()).toContain('El servidor no pudo completar la solicitud');
    expect(store.lastUpdated()).toBeNull();
    expect(store.summary()).not.toBeNull();
  });

  it('should poll again after ten seconds', async () => {
    completeInitialCycle();

    await vi.advanceTimersByTimeAsync(9_999);
    httpTestingController.expectNone('https://api.test/api/dashboard/summary/');

    await vi.advanceTimersByTimeAsync(1);
    completeInitialCycle();
  });

  it('should pause polling while the document is hidden', async () => {
    completeInitialCycle();
    setDocumentHidden(true);

    await vi.advanceTimersByTimeAsync(30_000);
    httpTestingController.expectNone('https://api.test/api/dashboard/summary/');

    setDocumentHidden(false);
    completeInitialCycle();
  });

  it('should respect Retry-After after a throttled response', async () => {
    httpTestingController.expectOne('https://api.test/api/dashboard/summary/').flush(
      {},
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '60' },
      },
    );
    httpTestingController.expectOne('https://api.test/api/nodes/').flush([]);
    httpTestingController.expectOne('https://api.test/api/alerts/active/').flush([]);
    expect(store.error()).toContain('límite');

    await vi.advanceTimersByTimeAsync(50_000);
    httpTestingController.expectNone('https://api.test/api/dashboard/summary/');

    await vi.advanceTimersByTimeAsync(10_000);
    completeInitialCycle();
  });

  it('should retry cold-start network failures with increasing delays and stop after success', async () => {
    failInitialCycleWithNetworkErrors();

    expect(store.retryAttempt()).toBe(1);
    expect(store.retryingConnection()).toBe(true);
    expect(store.retryAvailable()).toBe(true);

    const delays = [3_000, 6_000, 12_000, 24_000, 45_000];
    for (let index = 0; index < delays.length; index += 1) {
      await vi.advanceTimersByTimeAsync(delays[index]);
      failInitialCycleWithNetworkErrors();
      if (index < delays.length - 1) {
        expect(store.retryAttempt()).toBe(index + 2);
      } else {
        expect(store.retryingConnection()).toBe(false);
        expect(store.retryAttempt()).toBe(5);
      }
    }

    await vi.advanceTimersByTimeAsync(60_000);
    httpTestingController.expectNone('https://api.test/api/dashboard/summary/');

    store.retryNow();
    completeInitialCycle();
    expect(store.retryAvailable()).toBe(false);
    expect(store.retryAttempt()).toBe(0);
    expect(store.loading()).toBe(false);
  });

  function completeInitialCycle(): void {
    httpTestingController.expectOne('https://api.test/api/dashboard/summary/').flush({
      total_nodes: 0,
      nodes_online: 0,
      nodes_offline: 0,
      nodes_unknown: 0,
      nodes_at_risk: 0,
      active_alerts: 0,
      overall_risk: 'NORMAL',
      latest_readings: [],
    });
    httpTestingController.expectOne('https://api.test/api/nodes/').flush([]);
    httpTestingController.expectOne('https://api.test/api/alerts/active/').flush([]);
  }

  function failInitialCycleWithNetworkErrors(): void {
    for (const url of [
      'https://api.test/api/dashboard/summary/',
      'https://api.test/api/nodes/',
      'https://api.test/api/alerts/active/',
    ]) {
      httpTestingController.expectOne(url).flush(
        { detail: 'Network error' },
        { status: 0, statusText: 'Unknown Error' },
      );
    }
  }

  function setDocumentHidden(hidden: boolean): void {
    Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }
});
