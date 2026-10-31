import { ConnectionStatus } from './connection-status.model';
import { Reading } from './reading.model';
import { Risk } from './risk.model';

export interface NodeStatus {
  node_id: string;
  connection_status: ConnectionStatus;
  last_communication: string | null;
  latest_reading: Reading | null;
  current_risk: Risk | null;
  current_risk_stale: boolean;
  active_alerts_count: number;
}
