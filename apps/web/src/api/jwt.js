// A decodificaÃ§Ã£o serve somente ao estado visual; assinatura, validade e permissÃµes continuam validadas pelo backend.
export function decodeJwtPayload(token) {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(segment.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
