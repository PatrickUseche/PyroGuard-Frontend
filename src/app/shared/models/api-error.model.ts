export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'throttled'
  | 'conflict'
  | 'not-found'
  | 'server'
  | 'unknown';

export interface ApiError {
  kind: ApiErrorKind;
  message: string;
  retryAfter?: number;
}
