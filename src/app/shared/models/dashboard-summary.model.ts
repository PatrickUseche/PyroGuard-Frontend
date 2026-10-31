import { Reading } from './reading.model';
import { Risk } from './risk.model';

export interface DashboardSummary {
  total_nodes: number;
  nodes_online: number;
  nodes_offline: number;
  nodes_unknown: number;
  nodes_at_risk: number;
  active_alerts: number;
  overall_risk: Risk;
  latest_readings: Reading[];
}
