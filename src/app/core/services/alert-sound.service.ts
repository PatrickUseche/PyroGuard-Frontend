import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Risk } from '../../shared/models/risk.model';

const STORAGE_KEY = 'pyroguard.alert-sound';
const SOUND_URL = 'sounds/alerta.mp3';

/** Veces que suena el aviso: una en advertencia y dos en incendio. */
const REPETITIONS: Record<Exclude<Risk, 'NORMAL'>, number> = { WARNING: 1, FIRE: 2 };

@Injectable({ providedIn: 'root' })
export class AlertSoundService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly enabledState = signal(this.readPreference());
  private audio: HTMLAudioElement | null = null;
  private remaining = 0;

  readonly enabled = this.enabledState.asReadonly();

  toggle(): void {
    this.setEnabled(!this.enabledState());
    if (this.enabledState()) {
      this.play('WARNING'); // vista previa al activar
    }
  }

  play(risk: Risk): void {
    if (!this.enabledState() || risk === 'NORMAL') {
      return;
    }
    const audio = this.audioElement();
    if (audio === null) {
      return;
    }
    this.remaining = REPETITIONS[risk] - 1;
    audio.currentTime = 0;
    // El navegador puede bloquear el audio hasta que el usuario interactúe con la página.
    audio.play().catch(() => undefined);
  }

  private audioElement(): HTMLAudioElement | null {
    if (!this.isBrowser || typeof Audio === 'undefined') {
      return null;
    }
    if (this.audio === null) {
      this.audio = new Audio(SOUND_URL);
      this.audio.preload = 'auto';
      this.audio.addEventListener('ended', () => {
        if (this.remaining > 0 && this.audio !== null) {
          this.remaining -= 1;
          this.audio.currentTime = 0;
          this.audio.play().catch(() => undefined);
        }
      });
    }
    return this.audio;
  }

  private setEnabled(value: boolean): void {
    this.enabledState.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      // Sin almacenamiento: la preferencia solo dura la sesión.
    }
  }

  private readPreference(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  }
}
