// Centralizaremos los mensajes de información, advertencias y errores.

const writeLog = (level, message, metadata) => {
  // Formato estructurado anterior, útil para producción:
  // const entry = { timestamp: new Date().toISOString(), level, message, metadata };
  // const output = JSON.stringify(entry);

  const fields = metadata?.errors
    ?.map((error) => error.field)
    .filter(Boolean);
  const detail = fields?.length
    ? fields.join(', ')
    : metadata?.message || metadata?.type || '';
  const output = `${message}${detail ? `: ${detail}` : ''}`;

  if (level === 'ERROR') {
    console.error(`ERROR: ${output}`);
    return;
  }

  if (level === 'WARN') {
    console.warn(`WARN: ${output}`);
    return;
  }

  console.log(`${level}: ${output}`);
};

export const logger = {
  info: (message, metadata) =>
    writeLog('INFO', message, metadata),

  warn: (message, metadata) =>
    writeLog('WARN', message, metadata),

  error: (message, metadata) =>
    writeLog('ERROR', message, metadata),

  debug: (message, metadata) =>
    writeLog('DEBUG', message, metadata)
};
