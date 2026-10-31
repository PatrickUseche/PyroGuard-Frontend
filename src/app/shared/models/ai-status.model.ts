export type AiStatus = 'OK' | 'DISABLED' | 'UNAVAILABLE' | 'REJECTED' | 'INVALID_RESPONSE';

export const AI_STATUS_LABELS: Record<AiStatus, string> = {
  OK: 'Disponible',
  DISABLED: 'Deshabilitada',
  UNAVAILABLE: 'No disponible',
  REJECTED: 'Rechazada',
  INVALID_RESPONSE: 'Respuesta inválida',
};
