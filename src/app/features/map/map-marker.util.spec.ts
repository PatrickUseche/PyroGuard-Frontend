import { isCompactMarker, markerAccessibleHtml, MapMarkerPresentation } from './map-marker.util';

const presentation = (className: string, label: string): MapMarkerPresentation => ({
  className,
  label,
  icon: '<svg></svg>',
});

describe('map marker', () => {
  it('should keep a visible label only for warning and fire', () => {
    expect(isCompactMarker(presentation('fire', 'Incendio'))).toBe(false);
    expect(isCompactMarker(presentation('warning', 'Advertencia'))).toBe(false);
    expect(isCompactMarker(presentation('normal', 'Normal'))).toBe(true);
    expect(isCompactMarker(presentation('offline', 'Desactualizado'))).toBe(true);
    expect(isCompactMarker(presentation('unknown', 'Sin datos'))).toBe(true);
  });

  it('should render compact markers with a screen-reader-only label', () => {
    const html = markerAccessibleHtml(presentation('normal', 'Normal'));

    expect(html).toContain('compact');
    expect(html).toContain('aria-label="Normal"');
    expect(html).toContain('<span class="sr-only">Normal</span>');
  });

  it('should render fire markers with a visible label', () => {
    const html = markerAccessibleHtml(presentation('fire', 'Incendio'));

    expect(html).not.toContain('compact');
    expect(html).toContain('<span>Incendio</span>');
  });
});
