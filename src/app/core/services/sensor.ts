import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SensorReading } from '../../shared/models/sensor-reading.model';

@Injectable({
  providedIn: 'root',
})
export class SensorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/readings/`;

  getLatestReadings(): Observable<SensorReading[]> {
    return this.http.get<SensorReading[]>(this.apiUrl);
  }
}