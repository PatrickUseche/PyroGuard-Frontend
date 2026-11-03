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

  if (error.status === 0) {
    return {
      kind: 'network',
      message: 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
    };
  }

  if (error.status === 401) {
    return {
      kind: 'unauthorized',
      message: 'Tu sesión no está autorizada. Inicia sesión de nuevo.',
    };
  }

  if (error.status === 429) {
    const retryAfter = parseRetryAfter(error.headers.get('Retry-After'));
    return {
      kind: 'throttled',
      message:
        retryAfter === undefined
          ? 'Se alcanzó el límite de intentos. Espera antes de volver a intentarlo.'
          : `Se alcanzó el límite de intentos. Inténtalo de nuevo en ${retryAfter} s.`,
      ...(retryAfter === undefined ? {} : { retryAfter }),
    };
  }

  if (error.status === 409) {
    return {
      kind: 'conflict',
      message: 'La operación no se puede realizar porque el estado actual cambió.',
    };
  }

  if (error.status === 404) {
    return {
      kind: 'not-found',
      message: 'El recurso solicitado no existe.',
    };
  }

  if (error.status >= 500) {
    return {
      kind: 'server',
      message: 'El servidor no pudo completar la solicitud. Inténtalo más tarde.',
    };
  }

  const validationMessage = getNonFieldError(error.error);
  return {
    kind: 'unknown',
    message: validationMessage ?? 'La solicitud no pudo completarse. Inténtalo de nuevo.',
  };
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
