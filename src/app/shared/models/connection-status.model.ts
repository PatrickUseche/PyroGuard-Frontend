export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  ONLINE: 'En línea',
  OFFLINE: 'Desconectado',
  UNKNOWN: 'Desconocido',
};
