export function createUuid() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Secure UUID generation is not available in this runtime');
  }
  return globalThis.crypto.randomUUID();
}
