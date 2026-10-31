import { ConnectionStatus } from './connection-status.model';
import { Risk } from './risk.model';

export interface Node {
  node_id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  last_communication: string | null;
  connection_status: ConnectionStatus;
  current_risk: Risk | null;
}
