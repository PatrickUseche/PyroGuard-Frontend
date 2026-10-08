import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorService } from './core/services/sensor';
import { SensorReading } from './shared/models/sensor-reading.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  readings: SensorReading[] = [];
  errorMessage: string = '';

  constructor(private sensorService: SensorService) {}

  ngOnInit(): void {
    this.loadReadings();
  }

  loadReadings(): void {
    this.sensorService.getLatestReadings().subscribe({
      next: (data: SensorReading[]) => {
        console.log("Datos recibidos:", data);
        this.readings = data;
      },
      error: (error: any) => {
        console.error('Error al conectar con la API:', error);
        this.errorMessage = JSON.stringify(error);
      }
    });
  }
}