import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { NodesService } from './nodes.service';

describe('NodesService', () => {
  let service: NodesService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NodesService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should request all nodes', () => {
    service.getAll().subscribe();

    const request = httpTestingController.expectOne('https://api.test/api/nodes/');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should request a node and its status', () => {
    service.getById('node-1').subscribe();
    const nodeRequest = httpTestingController.expectOne('https://api.test/api/nodes/node-1/');
    expect(nodeRequest.request.method).toBe('GET');
    nodeRequest.flush({});

    service.getStatus('node-1').subscribe();
    const statusRequest = httpTestingController.expectOne(
      'https://api.test/api/nodes/node-1/status/',
    );
    expect(statusRequest.request.method).toBe('GET');
    statusRequest.flush({});
  });
});
