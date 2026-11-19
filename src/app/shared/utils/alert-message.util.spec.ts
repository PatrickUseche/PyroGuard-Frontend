import { parseAlertMessage } from './alert-message.util';

describe('parseAlertMessage', () => {
  it('splits summary and reasons', () => {
    expect(
      parseAlertMessage(
        'Alerta de incendio (nivel FIRE) en el nodo NODE-001. Razones: llama detectada; temperatura alta',
      ),
    ).toEqual({
      summary: 'Alerta de incendio (nivel FIRE) en el nodo NODE-001',
      reasons: ['llama detectada', 'temperatura alta'],
    });
  });

  it('returns no reasons when the backend has none', () => {
    expect(
      parseAlertMessage(
        'Alerta de advertencia (nivel WARNING) en el nodo N1. Razones: sin razones adicionales',
      ).reasons,
    ).toEqual([]);
  });

  it('keeps free-form messages as the summary', () => {
    expect(parseAlertMessage('El nodo no responde.')).toEqual({
      summary: 'El nodo no responde.',
      reasons: [],
    });
  });
});
