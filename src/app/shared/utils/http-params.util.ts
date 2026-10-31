import { HttpParams } from '@angular/common/http';

export type QueryParameters = Record<string, string | number | undefined>;

export function createHttpParams(values: QueryParameters): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      params = params.set(key, value);
    }
  }

  return params;
}
