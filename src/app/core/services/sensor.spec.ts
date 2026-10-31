import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { SensorService } from './sensor';

describe('SensorService', () => {
  let service: SensorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(SensorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
