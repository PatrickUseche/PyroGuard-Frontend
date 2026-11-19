import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

function token(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (match === null) {
    throw new Error(`Falta el token ${name} con un color hexadecimal`);
  }
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('tema oscuro', () => {
  it('es el único tema: no depende de prefers-color-scheme', () => {
    expect(css).not.toContain('prefers-color-scheme');
    expect(css).toContain('color-scheme: dark');
  });

  it('usa la paleta «sala de control»', () => {
    expect(token('--color-page')).toBe('#0e1418');
    expect(token('--color-surface')).toBe('#151d23');
    expect(token('--color-text')).toBe('#e6eef2');
    expect(token('--color-text-muted')).toBe('#8aa0ab');
  });

  it('el texto y el texto atenuado cumplen 4,5:1 sobre la superficie y la página', () => {
    for (const background of ['--color-surface', '--color-page']) {
      expect(contrast(token('--color-text'), token(background))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token('--color-text-muted'), token(background))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las insignias de riesgo cumplen 4,5:1', () => {
    for (const risk of ['normal', 'warning', 'fire']) {
      expect(
        contrast(token(`--risk-${risk}-text`), token(`--risk-${risk}-bg`)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las clases de riesgo se distinguen del fondo (3:1)', () => {
    for (const risk of ['normal', 'warning', 'fire']) {
      expect(contrast(token(`--class-${risk}`), token('--color-page'))).toBeGreaterThanOrEqual(3);
    }
  });

  it('las series de datos se distinguen de la superficie (3:1) y no usan colores de riesgo', () => {
    const riskColors = ['--class-normal', '--class-warning', '--class-fire'].map(token);
    for (let n = 1; n <= 5; n += 1) {
      const color = token(`--data-${n}`);
      expect(contrast(color, token('--color-surface'))).toBeGreaterThanOrEqual(3);
      expect(riskColors).not.toContain(color);
    }
  });
});
