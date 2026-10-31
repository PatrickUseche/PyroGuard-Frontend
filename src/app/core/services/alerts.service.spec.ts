import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AlertsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should request active alerts', () => {
    service.getActive().subscribe();

    const request = httpTestingController.expectOne('https://api.test/api/alerts/active/');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should send alert filters', () => {
    service
      .getAll({
        status: 'ACTIVE',
        level: 'FIRE',
        node_id: 'node-1',
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-02T00:00:00Z',
        limit: 20,
        offset: 5,
      })
      .subscribe();

    const request = httpTestingController.expectOne(
      (candidate) => candidate.url === 'https://api.test/api/alerts/',
    );
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('level')).toBe('FIRE');
    expect(request.request.params.get('node_id')).toBe('node-1');
    expect(request.request.params.get('from')).toBe('2026-10-01T00:00:00Z');
    expect(request.request.params.get('to')).toBe('2026-10-02T00:00:00Z');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('offset')).toBe('5');
    request.flush([]);
  });

  it('should post alert acknowledge and close transitions', () => {
    service.acknowledge(7).subscribe();
    const acknowledgeRequest = httpTestingController.expectOne(
      'https://api.test/api/alerts/7/acknowledge/',
    );
    expect(acknowledgeRequest.request.method).toBe('POST');
    acknowledgeRequest.flush({});

    service.close(7).subscribe();
    const closeRequest = httpTestingController.expectOne('https://api.test/api/alerts/7/close/');
    expect(closeRequest.request.method).toBe('POST');
    closeRequest.flush({});
  });
});
