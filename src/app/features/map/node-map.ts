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
import { SimulatedBadge } from '../../shared/components/simulated-badge/simulated-badge';
import { Node } from '../../shared/models/node.model';
import { Risk } from '../../shared/models/risk.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { DashboardStore } from '../dashboard/dashboard-store';
import {
  filterLocatedNodes,
  MapMarkerPresentation,
  mapMarkerPresentation,
  isCompactMarker,
  markerAccessibleHtml,
} from './map-marker.util';

/** La alarma nunca queda tapada: los marcadores de mayor riesgo se dibujan encima. */
function markerPriority(className: string): number {
  return className === 'fire' ? 1000 : className === 'warning' ? 500 : 0;
}

/** Distancia en píxeles por debajo de la cual dos marcadores se consideran solapados. */
const MARKER_CLUSTER_PIXELS = 44;

@Component({
  selector: 'app-node-map',
  standalone: true,
  imports: [ConnectionBadge, RiskBadge, RouterLink, SimulatedBadge, StateMessage],
  template: `
    <section class="map-page" aria-labelledby="map-title">
      <header>
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
        <div
          #mapHost
          class="map-host"
          role="application"
          aria-label="Mapa interactivo de nodos"
          tabindex="0"
        ></div>
        <p class="map-attribution">© OpenStreetMap contributors</p>
      }

      @if (selectedNode(); as node) {
        <section class="selected-node" aria-labelledby="selected-node-title">
          <div class="selected-heading">
            <div>
              <h2 id="selected-node-title">{{ node.name }}</h2>
              <p>{{ node.node_id }}</p>
              <app-simulated-badge [nodeId]="node.node_id" />
            </div>
            <app-connection-badge [status]="node.connection_status" />
          </div>
          <div class="selected-risk">
            <span>Riesgo</span>
            @if (node.connection_status === 'UNKNOWN') {
              <app-risk-badge [risk]="null" emptyLabel="Sin datos" />
            } @else {
              <app-risk-badge
                [risk]="riskFor(node)"
                [stale]="node.connection_status === 'OFFLINE'"
              />
            }
          </div>
          <p>
            Última comunicación:
            <time
              [attr.datetime]="node.last_communication"
              [attr.title]="formatFullDate(node.last_communication)"
            >
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

    h1,
    p {
      margin: 0;
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
      border: var(--panel-border);
      border-radius: var(--radius-card);
      overflow: hidden;
      background: var(--color-surface-muted);
    }

    .selected-node {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: var(--panel-border);
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
  /** Posición real de cada nodo; el marcador puede dibujarse desplazado para no solaparse. */
  private readonly positions = new Map<string, L.LatLng>();
  private readonly keyboardMarkers = new WeakSet<HTMLElement>();
  readonly selectedNodeId = signal<string | null>(null);
  readonly locatedNodes = computed(() => filterLocatedNodes(this.store.nodes()));
  readonly selectedNode = computed(
    () => this.store.nodes().find((node) => node.node_id === this.selectedNodeId()) ?? null,
  );
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;
  private hasFittedBounds = false;

  constructor() {
    effect(() => {
      if (this.locatedNodes().length === 0) {
        this.destroyMap();
      } else if (this.map !== null) {
        this.updateMarkers();
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
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.map.on('zoomend', () => this.spreadMarkers());
    this.updateMarkers();
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
    this.positions.clear();
    this.hasFittedBounds = false;
  }

  private updateMarkers(): void {
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
        this.positions.delete(nodeId);
        refitBounds = true;
      }
    }

    for (const node of locatedNodes) {
      const latitude = node.latitude;
      const longitude = node.longitude;

      const marker = this.markers.get(node.node_id);
      const details = mapMarkerPresentation(node, this.riskFor(node));
      const signature = `${details.className}:${details.label}`;
      if (marker === undefined) {
        const newMarker = L.marker([latitude, longitude], {
          icon: this.createMarkerIcon(details),
          title: `${node.name}: ${details.label}`,
          keyboard: true,
          zIndexOffset: markerPriority(details.className),
        }).addTo(this.map);
        newMarker.on('click', () => this.selectNode(node.node_id));
        this.setMarkerAccessibleLabel(newMarker, node, details.label);
        this.markers.set(node.node_id, newMarker);
        this.markerSignatures.set(node.node_id, signature);
        this.positions.set(node.node_id, L.latLng(latitude, longitude));
        refitBounds = true;
      } else {
        const previousPosition = this.positions.get(node.node_id);
        if (
          previousPosition === undefined ||
          previousPosition.lat !== latitude ||
          previousPosition.lng !== longitude
        ) {
          this.positions.set(node.node_id, L.latLng(latitude, longitude));
          refitBounds = true;
        }
        if (this.markerSignatures.get(node.node_id) !== signature) {
          marker.setZIndexOffset(markerPriority(details.className));
          marker.setIcon(this.createMarkerIcon(details));
          this.markerSignatures.set(node.node_id, signature);
        }
        marker.options.title = `${node.name}: ${details.label}`;
        this.setMarkerAccessibleLabel(marker, node, details.label);
      }
    }

    this.spreadMarkers();

    if (refitBounds && locatedNodes.length > 0) {
      const bounds = L.latLngBounds(locatedNodes.map((node) => [node.latitude, node.longitude]));
      this.map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
      this.hasFittedBounds = true;
    }
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

  /**
   * Abre en abanico los marcadores que quedan a pocos píxeles entre sí. Es solo visual:
   * la posición real de cada nodo no cambia y se recalcula en cada zoom.
   */
  private spreadMarkers(): void {
    const map = this.map;
    if (map === null) {
      return;
    }

    const points = [...this.positions].map(([id, position]) => ({
      id,
      position,
      point: map.latLngToContainerPoint(position),
    }));
    const groups: (typeof points)[] = [];
    for (const item of points) {
      const group = groups.find((members) =>
        members.some((other) => other.point.distanceTo(item.point) < MARKER_CLUSTER_PIXELS),
      );
      if (group === undefined) {
        groups.push([item]);
      } else {
        group.push(item);
      }
    }

    for (const group of groups) {
      // Los de mayor riesgo primero, para que ocupen la posición de las 12 en punto.
      group.sort((a, b) => this.markerRank(b.id) - this.markerRank(a.id));
      group.forEach((item, index) => {
        const marker = this.markers.get(item.id);
        if (marker === undefined) {
          return;
        }
        if (group.length === 1) {
          marker.setLatLng(item.position);
          return;
        }
        const angle = (2 * Math.PI * index) / group.length - Math.PI / 2;
        const radius = 44 + 10 * group.length;
        const shifted = L.point(
          item.point.x + radius * Math.cos(angle),
          item.point.y + radius * Math.sin(angle),
        );
        marker.setLatLng(map.containerPointToLatLng(shifted));
      });
    }
  }

  private markerRank(nodeId: string): number {
    const className = this.markerSignatures.get(nodeId)?.split(':')[0];
    return className === 'fire' ? 2 : className === 'warning' ? 1 : 0;
  }

  private createMarkerIcon(details: MapMarkerPresentation): L.DivIcon {
    return L.divIcon({
      className: 'pyroguard-marker-container',
      html: markerAccessibleHtml(details),
      iconSize: isCompactMarker(details) ? [40, 40] : [128, 40],
      iconAnchor: isCompactMarker(details) ? [20, 20] : [64, 20],
    });
  }
}
