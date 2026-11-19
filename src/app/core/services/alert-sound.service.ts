import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Risk } from '../../shared/models/risk.model';

const STORAGE_KEY = 'pyroguard.alert-sound';

/** Notas (Hz, inicio s, duración s) de cada sonido: advertencia = aviso suave; incendio = alarma urgente. */
const TONES: Record<Exclude<Risk, 'NORMAL'>, { freq: number; start: number; dur: number }[]> = {
  WARNING: [
    { freq: 660, start: 0, dur: 0.18 },
    { freq: 880, start: 0.22, dur: 0.18 },
  ],
  FIRE: [
    { freq: 960, start: 0, dur: 0.22 },
    { freq: 720, start: 0.26, dur: 0.22 },
    { freq: 960, start: 0.52, dur: 0.22 },
    { freq: 720, start: 0.78, dur: 0.22 },
    { freq: 960, start: 1.04, dur: 0.22 },
  ],
};

@Injectable({ providedIn: 'root' })
export class AlertSoundService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly enabledState = signal(this.readPreference());
  private context: AudioContext | null = null;

  readonly enabled = this.enabledState.asReadonly();

  constructor() {
    if (this.isBrowser) {
      // Los navegadores solo permiten audio tras un gesto del usuario.
      const unlock = (): void => {
        this.audioContext()
          ?.resume()
          .catch(() => undefined);
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
    }
  }

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
    const context = this.audioContext();
    if (context === null || context.state !== 'running') {
      return;
    }
    const now = context.currentTime;
    for (const tone of TONES[risk]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = risk === 'FIRE' ? 'square' : 'sine';
      oscillator.frequency.value = tone.freq;
      const peak = risk === 'FIRE' ? 0.12 : 0.18;
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(peak, now + tone.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + tone.start);
      oscillator.stop(now + tone.start + tone.dur + 0.02);
    }
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

  private audioContext(): AudioContext | null {
    if (!this.isBrowser || typeof AudioContext === 'undefined') {
      return null;
    }
    this.context ??= new AudioContext();
    return this.context;
  }
}
