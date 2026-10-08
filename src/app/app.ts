import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http'; // Necesario para *ngIf, *ngFor y pipes de fecha
import { SensorService } from './core/services/sensor';
import { SensorReading } from './shared/models/sensor-reading.model';

interface AppReadingsError extends HttpErrorResponse {}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule], // Importante para componentes standalone
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  readings: SensorReading[] = [];

  constructor(private sensorService: SensorService) {}

  ngOnInit(): void {
    this.fetchReadings();
    
    // Opcional: Actualizar los datos automáticamente cada 5 segundos
    setInterval(() => {
      this.fetchReadings();
    }, 5000);
  }

  fetchReadings(): void {
    this.sensorService.getLatestReadings().subscribe({
      next: (data: SensorReading[]): void => {
        this.readings = data;
      },
      error: (error: AppReadingsError): void => {
        console.error('Error al conectar con la API:', error);
      }
    });
  }
}