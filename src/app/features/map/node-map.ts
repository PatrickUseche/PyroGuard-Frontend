import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-node-map',
  standalone: true,
  template: `
    <section class="map-page" aria-labelledby="map-title">
      <header>
        <p class="eyebrow">Georreferenciación</p>
        <h1 id="map-title">Mapa de nodos</h1>
        <p>Mapa base de OpenStreetMap; las ubicaciones se mostrarán cuando estén registradas.</p>
      </header>
      <div #mapHost class="map-host" role="application" aria-label="Mapa base de nodos" tabindex="0"></div>
      <p class="map-attribution">© OpenStreetMap contributors</p>
    </section>
  `,
  styles: `
    .map-page {
      display: grid;
      gap: var(--space-4);
    }

    .eyebrow,
    h1,
    p {
      margin: 0;
    }

    .eyebrow {
      margin-bottom: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    h1 {
      margin-bottom: var(--space-2);
      font-size: clamp(1.6rem, 3vw, 2rem);
    }

    .map-page header p:last-child,
    .map-attribution {
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .map-host {
      min-height: 480px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      overflow: hidden;
      background: var(--color-surface-muted);
    }

    @media (max-width: 640px) {
      .map-host {
        min-height: 400px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost') private mapHost?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private map: L.Map | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || this.mapHost === undefined) {
      return;
    }

    this.map = L.map(this.mapHost.nativeElement, {
      center: [0, 0],
      zoom: 2,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }
}
