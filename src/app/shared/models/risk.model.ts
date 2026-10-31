export type Risk = 'NORMAL' | 'WARNING' | 'FIRE';

export const RISK_LABELS: Record<Risk, string> = {
  NORMAL: 'Normal',
  WARNING: 'Advertencia',
  FIRE: 'Incendio',
};
