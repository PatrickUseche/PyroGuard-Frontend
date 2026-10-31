import { AlertStatus } from './alert-status.model';

export type AlertLevel = 'WARNING' | 'FIRE';

export interface Alert {
  id: number;
  node_id: string;
  reading_id: number | null;
  level: AlertLevel;
  probability: number | null;
  message: string;
  status: AlertStatus;
  occurrences: number;
  created_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
  closed_at: string | null;
}
