export function isSimulatedNode(nodeId: string): boolean {
  return nodeId.startsWith('SIM-');
}
