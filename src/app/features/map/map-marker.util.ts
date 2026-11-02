import { Node } from '../../shared/models/node.model';
import { Risk } from '../../shared/models/risk.model';
import { isSimulatedNode } from '../../shared/utils/simulated-node.util';

export interface MapMarkerPresentation {
  className: string;
  label: string;
  icon: string;
}

const normalIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Zm-3.5 9 2.3 2.3 4.8-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
const warningIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
const fireIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.4 2.5c.6 3.5-2.9 4.7-2.9 8.1-1.1-.7-1.8-1.8-2-3.1C4.8 10 4 12.1 4 14.3a8 8 0 0 0 16 0c0-4.1-2.6-8.5-7.6-11.8Z" fill="currentColor"/></svg>';
const statusIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5m0-8v.1" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>';

export function filterLocatedNodes(nodes: Node[]): Array<Node & { latitude: number; longitude: number }> {
  return nodes.filter(
    (node): node is Node & { latitude: number; longitude: number } =>
      node.latitude !== null && node.longitude !== null,
  );
}

export function mapMarkerPresentation(node: Node, risk: Risk | null): MapMarkerPresentation {
  let presentation: MapMarkerPresentation;
  if (node.connection_status === 'OFFLINE') {
    presentation = { className: 'offline', label: 'Desactualizado', icon: statusIcon };
  } else if (node.connection_status === 'UNKNOWN') {
    presentation = { className: 'unknown', label: 'Sin datos', icon: statusIcon };
  } else if (risk === 'NORMAL') {
    presentation = { className: 'normal', label: 'Normal', icon: normalIcon };
  } else if (risk === 'WARNING') {
    presentation = { className: 'warning', label: 'Advertencia', icon: warningIcon };
  } else if (risk === 'FIRE') {
    presentation = { className: 'fire', label: 'Incendio', icon: fireIcon };
  } else {
    presentation = { className: 'unknown', label: 'Sin evaluar', icon: statusIcon };
  }

  return isSimulatedNode(node.node_id)
    ? { ...presentation, label: `${presentation.label} · Simulado` }
    : presentation;
}

export function markerAccessibleHtml(presentation: MapMarkerPresentation): string {
  return `<span class="pyroguard-marker ${presentation.className}" role="img" aria-label="${presentation.label}">${presentation.icon}<span>${presentation.label}</span></span>`;
}
