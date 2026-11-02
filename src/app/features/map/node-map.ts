import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { Node } from '../../shared/models/node.model';
import { Risk } from '../../shared/models/risk.model';
import { DashboardStore } from '../dashboard/dashboard-store';

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
  readonly store = inject(DashboardStore);
  private map: L.Map | null = null;
  private readonly markers = new Map<string, L.Marker>();

  constructor() {
    effect(() => {
      const nodes = this.store.nodes();
      if (this.map !== null) {
        this.updateMarkers(nodes);
      }
    });
  }

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
    this.updateMarkers(this.store.nodes());
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.markers.clear();
  }

  private updateMarkers(nodes: Node[]): void {
    if (this.map === null) {
      return;
    }

    const locatedNodes = nodes.filter(
      (node): node is Node & { latitude: number; longitude: number } =>
        node.latitude !== null && node.longitude !== null,
    );
    const locatedIds = new Set(locatedNodes.map((node) => node.node_id));
    for (const [nodeId, marker] of this.markers) {
      if (!locatedIds.has(nodeId)) {
        marker.remove();
        this.markers.delete(nodeId);
      }
    }

    for (const node of locatedNodes) {
      const latitude = node.latitude;
      const longitude = node.longitude;

      const marker = this.markers.get(node.node_id);
      const risk = node.current_risk ?? this.latestRisk(node.node_id);
      const details = this.markerDetails(node, risk);
      if (marker === undefined) {
        this.markers.set(
          node.node_id,
          L.marker([latitude, longitude], {
            icon: this.createMarkerIcon(details),
            title: `${node.name}: ${details.label}`,
          }).addTo(this.map),
        );
      } else {
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(this.createMarkerIcon(details));
        marker.options.title = `${node.name}: ${details.label}`;
      }
    }

    if (locatedNodes.length > 0) {
      const bounds = L.latLngBounds(
        locatedNodes.map((node) => [node.latitude, node.longitude]),
      );
      this.map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
    }
  }

  private latestRisk(nodeId: string): Risk | null {
    return (
      this.store.summary()?.latest_readings.find((reading) => reading.node_id === nodeId)
        ?.risk_level ?? null
    );
  }

  private markerDetails(
    node: Node,
    risk: Risk | null,
  ): { className: string; label: string; icon: string } {
    if (node.connection_status === 'OFFLINE') {
      return { className: 'offline', label: 'Desactualizado', icon: statusIcon };
    }
    if (node.connection_status === 'UNKNOWN') {
      return { className: 'unknown', label: 'Sin datos', icon: statusIcon };
    }
    if (risk === 'NORMAL') {
      return { className: 'normal', label: 'Normal', icon: normalIcon };
    }
    if (risk === 'WARNING') {
      return { className: 'warning', label: 'Advertencia', icon: warningIcon };
    }
    if (risk === 'FIRE') {
      return { className: 'fire', label: 'Incendio', icon: fireIcon };
    }
    return { className: 'unknown', label: 'Sin evaluar', icon: statusIcon };
  }

  private createMarkerIcon(details: {
    className: string;
    label: string;
    icon: string;
  }): L.DivIcon {
    return L.divIcon({
      className: 'pyroguard-marker-container',
      html: `<span class="pyroguard-marker ${details.className}" role="img" aria-label="${details.label}">${details.icon}<span>${details.label}</span></span>`,
      iconSize: [128, 40],
      iconAnchor: [64, 20],
    });
  }
}

const normalIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Zm-3.5 9 2.3 2.3 4.8-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
const warningIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
const fireIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.4 2.5c.6 3.5-2.9 4.7-2.9 8.1-1.1-.7-1.8-1.8-2-3.1C4.8 10 4 12.1 4 14.3a8 8 0 0 0 16 0c0-4.1-2.6-8.5-7.6-11.8Z" fill="currentColor"/></svg>';
const statusIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5m0-8v.1" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>';
