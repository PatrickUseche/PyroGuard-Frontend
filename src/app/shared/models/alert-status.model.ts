export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'CLOSED';

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  ACTIVE: 'Activa',
  ACKNOWLEDGED: 'Reconocida',
  CLOSED: 'Cerrada',
};
