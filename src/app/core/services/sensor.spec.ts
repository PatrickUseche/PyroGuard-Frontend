import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SensorService } from './sensor';

describe('SensorService', () => {
  let service: SensorService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SensorService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request readings from the configured API URL', () => {
    service.getLatestReadings().subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/readings/`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
