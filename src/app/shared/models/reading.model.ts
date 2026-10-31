import { AiResult } from './ai-result.model';
import { Risk } from './risk.model';

export interface Reading {
  node_id: string;
  temperature: number;
  humidity: number;
  smoke: number;
  gas: number | null;
  flame: boolean;
  timestamp: string;
  risk_level: Risk | null;
  ai: AiResult | null;
}
