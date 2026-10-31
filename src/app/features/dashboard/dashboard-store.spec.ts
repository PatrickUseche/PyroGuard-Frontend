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

  afterEach(() => httpTestingController.verify());

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
});
