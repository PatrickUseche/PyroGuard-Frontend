const relativeFormatter = new Intl.RelativeTimeFormat('es-CO', {
  numeric: 'auto',
  style: 'narrow',
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export function formatRelativeTime(value: string | null, now = Date.now()): string {
  if (value === null) {
    return 'Sin comunicación registrada';
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'Fecha desconocida';
  }

  const differenceInSeconds = Math.round((timestamp - now) / 1000);
  const absoluteSeconds = Math.abs(differenceInSeconds);

  if (absoluteSeconds < 60) {
    return relativeFormatter.format(differenceInSeconds, 'second');
  }
  if (absoluteSeconds < 60 * 60) {
    return relativeFormatter.format(Math.round(differenceInSeconds / 60), 'minute');
  }
  if (absoluteSeconds < 24 * 60 * 60) {
    return relativeFormatter.format(Math.round(differenceInSeconds / 3600), 'hour');
  }
  return relativeFormatter.format(Math.round(differenceInSeconds / 86400), 'day');
}

export function formatFullDate(value: string | null): string {
  if (value === null) {
    return 'Sin fecha registrada';
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? dateFormatter.format(new Date(timestamp))
    : 'Fecha desconocida';
}
