import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { SensorReading } from "../../shared/models/sensor-reading.model";

@Injectable({
    providedIn: 'root'
})
export class SensorService {
    private apiUrl = 'http://localhost:8000/api/readings/';

    constructor(private http: HttpClient){}

    getLatestReadings(): Observable<SensorReading[]>{
        return this.http.get<SensorReading[]>(this.apiUrl);
    }
}