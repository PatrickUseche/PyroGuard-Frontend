import { AiStatus } from './ai-status.model';
import { Risk } from './risk.model';

export interface AiResult {
  status: AiStatus;
  risk_level: Risk | null;
  probability: number | null;
  probabilities: Partial<Record<Risk, number>>;
  model_version: string | null;
}
