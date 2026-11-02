import { isSimulatedNode } from './simulated-node.util';

describe('isSimulatedNode', () => {
  it('should identify node IDs with the SIM- prefix', () => {
    expect(isSimulatedNode('SIM-001')).toBe(true);
    expect(isSimulatedNode('NODE-001')).toBe(false);
    expect(isSimulatedNode('sim-001')).toBe(false);
  });
});
