export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'throttled'
  | 'conflict'
  | 'server'
  | 'unknown';

export interface ApiError {
  kind: ApiErrorKind;
  message: string;
  retryAfter?: number;
}
