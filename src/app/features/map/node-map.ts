import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { ConnectionBadge } from '../../shared/components/connection-badge/connection-badge';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { Node } from '../../shared/models/node.model';
import { Risk } from '../../shared/models/risk.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { DashboardStore } from '../dashboard/dashboard-store';

@Component({
  selector: 'app-node-map',
  standalone: true,
  imports: [ConnectionBadge, RiskBadge, RouterLink, StateMessage],
  template: `
    <section class="map-page" aria-labelledby="map-title">
      <header>
        <p class="eyebrow">Georreferenciación</p>
        <h1 id="map-title">Mapa de nodos</h1>
        <p>Mapa base de OpenStreetMap; las ubicaciones se mostrarán cuando estén registradas.</p>
      </header>
      @if (locatedNodes().length === 0) {
        <app-state-message
          kind="empty"
          title="No hay nodos con ubicación"
          message="Registra coordenadas para que los nodos aparezcan en el mapa."
        />
      } @else {
        <div #mapHost class="map-host" role="application" aria-label="Mapa interactivo de nodos" tabindex="0"></div>
        <p class="map-attribution">© OpenStreetMap contributors</p>
      }

      @if (selectedNode(); as node) {
        <section class="selected-node" aria-labelledby="selected-node-title">
          <div class="selected-heading">
            <div>
              <h2 id="selected-node-title">{{ node.name }}</h2>
              <p>{{ node.node_id }}</p>
            </div>
            <app-connection-badge [status]="node.connection_status" />
          </div>
          <div class="selected-risk">
            <span>Riesgo</span>
            @if (node.connection_status === 'UNKNOWN') {
              <app-risk-badge [risk]="null" emptyLabel="Sin datos" />
            } @else {
              <app-risk-badge [risk]="riskFor(node)" [stale]="node.connection_status === 'OFFLINE'" />
            }
          </div>
          <p>
            Última comunicación:
            <time [attr.datetime]="node.last_communication" [attr.title]="formatFullDate(node.last_communication)">
              {{ formatRelativeTime(node.last_communication) }}
            </time>
          </p>
          <a [routerLink]="['/nodos', node.node_id]">Ver detalle</a>
        </section>
      }
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

    .selected-node {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .selected-heading,
    .selected-risk {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .selected-node h2,
    .selected-node p {
      margin: 0;
    }

    .selected-heading p,
    .selected-risk > span {
      color: var(--color-text-muted);
    }

    .selected-node a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
      font-weight: 650;
    }

    @media (max-width: 640px) {
      .map-host {
        min-height: 400px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeMap implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  readonly store = inject(DashboardStore);
  private map: L.Map | null = null;
  private readonly markers = new Map<string, L.Marker>();
  private readonly markerSignatures = new Map<string, string>();
  private readonly keyboardMarkers = new WeakSet<HTMLElement>();
  readonly selectedNodeId = signal<string | null>(null);
  readonly locatedNodes = computed(() =>
    this.store
      .nodes()
      .filter(
        (node): node is Node & { latitude: number; longitude: number } =>
          node.latitude !== null && node.longitude !== null,
      ),
  );
  readonly selectedNode = computed(
    () => this.store.nodes().find((node) => node.node_id === this.selectedNodeId()) ?? null,
  );
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;
  private hasFittedBounds = false;

  constructor() {
    effect(() => {
      const nodes = this.store.nodes();
      if (this.locatedNodes().length === 0) {
        this.destroyMap();
      } else if (this.map !== null) {
        this.updateMarkers(nodes);
      }
    });
  }

  @ViewChild('mapHost')
  set mapHost(element: ElementRef<HTMLDivElement> | undefined) {
    this.mapHostElement = element;
    this.initializeMap();
  }

  private mapHostElement?: ElementRef<HTMLDivElement>;

  private initializeMap(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      this.mapHostElement === undefined ||
      this.map !== null ||
      this.locatedNodes().length === 0
    ) {
      return;
    }

    this.map = L.map(this.mapHostElement.nativeElement, {
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
    this.destroyMap();
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
  }

  riskFor(node: Node): Risk | null {
    return (
      node.current_risk ??
      this.store.summary()?.latest_readings.find((reading) => reading.node_id === node.node_id)
        ?.risk_level ??
      null
    );
  }

  private destroyMap(): void {
    this.map?.remove();
    this.map = null;
    this.markers.clear();
    this.markerSignatures.clear();
    this.hasFittedBounds = false;
  }

  private updateMarkers(nodes: Node[]): void {
    if (this.map === null) {
      return;
    }

    const locatedNodes = this.locatedNodes();
    const locatedIds = new Set(locatedNodes.map((node) => node.node_id));
    let refitBounds = !this.hasFittedBounds;
    for (const [nodeId, marker] of this.markers) {
      if (!locatedIds.has(nodeId)) {
        marker.remove();
        this.markers.delete(nodeId);
        this.markerSignatures.delete(nodeId);
        refitBounds = true;
      }
    }

    for (const node of locatedNodes) {
      const latitude = node.latitude;
      const longitude = node.longitude;

      const marker = this.markers.get(node.node_id);
      const details = this.markerDetails(node, this.riskFor(node));
      const signature = `${details.className}:${details.label}`;
      if (marker === undefined) {
        const newMarker = L.marker([latitude, longitude], {
          icon: this.createMarkerIcon(details),
          title: `${node.name}: ${details.label}`,
          keyboard: true,
        }).addTo(this.map);
        newMarker.on('click', () => this.selectNode(node.node_id));
        this.setMarkerAccessibleLabel(newMarker, node, details.label);
        this.markers.set(node.node_id, newMarker);
        this.markerSignatures.set(node.node_id, signature);
        refitBounds = true;
      } else {
        const previousPosition = marker.getLatLng();
        if (previousPosition.lat !== latitude || previousPosition.lng !== longitude) {
          marker.setLatLng([latitude, longitude]);
          refitBounds = true;
        }
        if (this.markerSignatures.get(node.node_id) !== signature) {
          marker.setIcon(this.createMarkerIcon(details));
          this.markerSignatures.set(node.node_id, signature);
        }
        marker.options.title = `${node.name}: ${details.label}`;
        this.setMarkerAccessibleLabel(marker, node, details.label);
      }
    }

    if (refitBounds && locatedNodes.length > 0) {
      const bounds = L.latLngBounds(
        locatedNodes.map((node) => [node.latitude, node.longitude]),
      );
      this.map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
      this.hasFittedBounds = true;
    }
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

  private setMarkerAccessibleLabel(marker: L.Marker, node: Node, riskLabel: string): void {
    const element = marker.getElement();
    if (element === undefined) {
      return;
    }

    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', `${node.name}: ${riskLabel}`);
    if (!this.keyboardMarkers.has(element)) {
      element.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.selectNode(node.node_id);
        }
      });
      this.keyboardMarkers.add(element);
    }
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
