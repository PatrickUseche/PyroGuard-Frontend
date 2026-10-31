import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DashboardService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should request the dashboard summary endpoint', () => {
    service.getSummary().subscribe();

    const request = httpTestingController.expectOne('https://api.test/api/dashboard/summary/');
    expect(request.request.method).toBe('GET');
    request.flush({
      total_nodes: 0,
      nodes_online: 0,
      nodes_offline: 0,
      nodes_unknown: 0,
      nodes_at_risk: 0,
      active_alerts: 0,
      overall_risk: 'NORMAL',
      latest_readings: [],
    });
  });
});
