import { randomUUID } from 'node:crypto';

const validRequestId = /^[A-Za-z0-9_-]{8,128}$/;

export function generateRequestId(request) {
  const candidate = request.headers['x-request-id'];
  return typeof candidate === 'string' && validRequestId.test(candidate) ? candidate : randomUUID();
}
