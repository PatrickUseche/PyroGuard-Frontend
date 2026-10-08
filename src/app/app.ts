import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
import { SensorService } from './core/services/sensor';
import { SensorReading } from './shared/models/sensor-reading.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  
  constructor(private sensorService: SensorService) {}

  ngOnInit(): void {
    this.sensorService.getLatestReadings().subscribe({
      next: (data: SensorReading[]) => {
        console.log('Datos recibidos exitosamente desde Django:', data);
      },
      error: (error) => {
        console.error('Error al conectar con la API:', error);
      }
    });
  }
}