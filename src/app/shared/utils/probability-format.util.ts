const probabilityFormatter = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function formatProbability(probability: number | null): string {
  return probability === null ? 'Probabilidad no disponible' : probabilityFormatter.format(probability);
}
