import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../../shared/models/api-error.model';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(catchError((error: unknown) => throwError(() => toApiError(error))));

function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'unknown',
      message: 'Ocurrió un error inesperado al comunicarse con el servidor.',
    };
  }

  const body = error.error;
  const responseFields = getResponseFields(body);

  if (error.status === 0) {
    return {
      kind: 'network',
      message: 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
      ...responseFields,
    };
  }

  if (error.status === 401) {
    return {
      kind: 'unauthorized',
      message: getDetailError(body) ?? 'Tu sesión no está autorizada. Inicia sesión de nuevo.',
      ...responseFields,
    };
  }

  if (error.status === 429) {
    const retryAfter = parseRetryAfter(error.headers.get('Retry-After'));
    const detail = getDetailError(body);
    return {
      kind: 'throttled',
      message:
        detail === undefined
          ? retryAfter === undefined
            ? 'Se alcanzó el límite de intentos. Espera antes de volver a intentarlo.'
            : `Se alcanzó el límite de intentos. Inténtalo de nuevo en ${retryAfter} s.`
          : retryAfter === undefined
            ? detail
            : `${detail} Inténtalo de nuevo en ${retryAfter} s.`,
      ...(retryAfter === undefined ? {} : { retryAfter }),
      ...responseFields,
    };
  }

  if (error.status === 409) {
    return {
      kind: 'conflict',
      message:
        getDetailError(body) ?? 'La operación no se puede realizar porque el estado actual cambió.',
      ...responseFields,
    };
  }

  if (error.status === 404) {
    return {
      kind: 'not-found',
      message: getDetailError(body) ?? 'El recurso solicitado no existe.',
      ...responseFields,
    };
  }

  if (error.status >= 500) {
    return {
      kind: 'server',
      message:
        getDetailError(body) ?? 'El servidor no pudo completar la solicitud. Inténtalo más tarde.',
      ...responseFields,
    };
  }

  const validationMessage = getDetailError(body) ?? getNonFieldError(body);
  return {
    kind: 'unknown',
    message: validationMessage ?? 'La solicitud no pudo completarse. Inténtalo de nuevo.',
    ...responseFields,
  };
}

function getResponseFields(body: unknown): Pick<ApiError, 'code' | 'data' | 'errors'> {
  if (!isRecord(body)) {
    return {};
  }

  const data = { ...body };
  delete data['status'];
  delete data['errors'];

  const errors = body['errors'];
  return {
    ...(typeof body['code'] === 'string' ? { code: body['code'] } : {}),
    ...(Object.keys(data).length > 0 ? { data } : {}),
    ...(isRecord(errors) ? { errors } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDetailError(body: unknown): string | undefined {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('errors' in body) ||
    typeof body.errors !== 'object' ||
    body.errors === null ||
    !('detail' in body.errors) ||
    typeof body.errors.detail !== 'string'
  ) {
    return undefined;
  }
  return body.errors.detail;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

function getNonFieldError(body: unknown): string | undefined {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('errors' in body) ||
    typeof body.errors !== 'object' ||
    body.errors === null ||
    !('non_field_errors' in body.errors) ||
    !Array.isArray(body.errors.non_field_errors)
  ) {
    return undefined;
  }

  const messages = body.errors.non_field_errors.filter(
    (message): message is string => typeof message === 'string',
  );
  return messages.length > 0 ? messages.join(' ') : undefined;
}
