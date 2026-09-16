// User-Agent é somente apresentação: não prova identidade, localização ou segurança do dispositivo.
export function describeDevice(value) {
  if (!value || typeof value !== 'string') return 'Dispositivo desconhecido';
  const browser = /Edg(?:e|A|iOS)?\//.test(value)
    ? 'Edge'
    : /(?:Firefox|FxiOS)\//.test(value)
      ? 'Firefox'
      : /(?:Chrome|CriOS)\//.test(value)
        ? 'Chrome'
        : /Version\/.*Safari\//.test(value)
          ? 'Safari'
          : null;
  const os = /Android/.test(value)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(value)
      ? 'iOS'
      : /Windows/.test(value)
        ? 'Windows'
        : /Macintosh|Mac OS X/.test(value)
          ? 'macOS'
          : /Linux/.test(value)
            ? 'Linux'
            : null;
  return browser && os ? `${browser} no ${os}` : 'Dispositivo desconhecido';
}

// DateTime UTC pode chegar sem sufixo; assume UTC só nesse formato ISO, mantendo offsets explícitos.
export function sessionTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return NaN;
  const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value) ? `${value}Z` : value;
  return new Date(utc).getTime();
}

export function formatSessionDate(value) {
  const timestamp = sessionTimestamp(value);
  if (!Number.isFinite(timestamp)) return 'Não informada';
  // Sem timeZone fixo: Intl converte UTC para o fuso local do navegador.
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
}

export function sortSessions(sessions) {
  return [...sessions].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      (sessionTimestamp(b.lastUsedAtUtc) || 0) - (sessionTimestamp(a.lastUsedAtUtc) || 0)
  );
}

// Falha de contrato não deve virar lista vazia nem permitir revogar uma sessão mal identificada.
export function normalizeSessions(items) {
  if (!Array.isArray(items)) throw new Error('Resposta de sessões inválida.');
  return items.map((item) => {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(item.id) ||
      typeof item.atual !== 'boolean'
    )
      throw new Error('Resposta de sessão inválida.');
    return {
      id: item.id,
      createdAtUtc: item.criadoEm,
      lastUsedAtUtc: item.ultimoUsoEm,
      expiresAtUtc: item.expiraEm,
      ip: item.ip,
      device: item.userAgent,
      current: item.atual
    };
  });
}
