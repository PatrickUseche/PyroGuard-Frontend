import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(HealthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should report a successful endpoint as online', () => {
    let status: string | undefined;
    service.check().subscribe((result) => (status = result));

    httpTestingController.expectOne('https://api.test/api/health/').flush({});

    expect(status).toBe('online');
  });

  it('should treat a missing health endpoint as unknown', () => {
    let status: string | undefined;
    service.check().subscribe((result) => (status = result));

    httpTestingController.expectOne('https://api.test/api/health/').flush(
      {},
      { status: 404, statusText: 'Not Found' },
    );

    expect(status).toBe('unknown');
  });

  it('should report network failure without misclassifying 404 as offline', () => {
    let status: string | undefined;
    service.check().subscribe((result) => (status = result));

    httpTestingController
      .expectOne('https://api.test/api/health/')
      .error(new ProgressEvent('error'));

    expect(status).toBe('offline');
  });
});
