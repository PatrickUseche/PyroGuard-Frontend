export interface ParsedAlertMessage {
  summary: string;
  reasons: string[];
}

const REASONS_SEPARATOR = /\s*Razones:\s*/i;
const NO_REASONS = /^sin razones adicionales\.?$/i;

/** Separa «Alerta de … Razones: a; b» en un resumen y una lista de razones legible. */
export function parseAlertMessage(message: string): ParsedAlertMessage {
  const [head, ...rest] = message.split(REASONS_SEPARATOR);
  if (rest.length === 0) {
    return { summary: message.trim(), reasons: [] };
  }
  const reasons = rest
    .join(' ')
    .split(';')
    .map((reason) => reason.trim().replace(/\.$/, ''))
    .filter((reason) => reason !== '' && !NO_REASONS.test(reason));
  return { summary: head.trim().replace(/[.:]$/, ''), reasons };
}
