import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Declaramos 'title' como una signal (usada en el app.html generado por Angular v19)
  title = signal('PyroGuard-FRONTEND');

  private apiService = inject(ApiService);

  ngOnInit(): void {
    this.apiService.getDatos().subscribe({
      next: (response: any) => {
        console.log('Conexión exitosa con el backend:', response);
      },
      error: (error: any) => {
        console.error('Error al conectar con el backend:', error);
      }
    });
  }
}