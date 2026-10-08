import { TestBed } from '@angular/core/testing';
import { Sensor } from './sensor';

describe('Sensor', () => {
  let service: Sensor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sensor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
