import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  constructor(
    private sensorService: SensorService,
    private cdr: ChangeDetectorRef // Inyectamos el detector de cambios
  ) {}

  ngOnInit(): void {
    this.loadReadings();
    
    // Refrescar cada 5 segundos
    setInterval(() => {
      this.loadReadings();
    }, 5000);
  }

  loadReadings(): void {
    this.sensorService.getLatestReadings().subscribe({
      next: (data: SensorReading[]) => {
        console.log("Datos recibidos:", data);
        this.readings = data;
        this.cdr.detectChanges(); // ¡Forzamos a Angular a pintar los datos en la pantalla!
      },
      error: (error: any) => {
        console.error('Error al conectar con la API:', error);
        this.errorMessage = JSON.stringify(error);
        this.cdr.detectChanges();
      }
    });
  }
}