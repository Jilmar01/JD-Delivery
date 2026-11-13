
import { validateMessage } from './message.schema.js';

const MAX_MESSAGE_SIZE = 1024 * 1024;

export const createMessageParser = (onMessage, onError) => {
  let buffer = '';

  const processBuffer = () => {
    let separatorIndex;

    while ((separatorIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, separatorIndex).trim();

      buffer = buffer.slice(separatorIndex + 1);

      if (!line) continue;

      try {
        const message = JSON.parse(line);
        const validation = validateMessage(message);

        if (!validation.success) {
          onError({
            type: 'VALIDATION_ERROR',
            errors: validation.errors
          });

          continue;
        }

        onMessage(validation.data);
      } catch {
        onError({
          type: 'INVALID_JSON',
          message: 'El mensaje recibido no contiene un JSON válido.'
        });
      }
    }

    if (Buffer.byteLength(buffer, 'utf8') > MAX_MESSAGE_SIZE) {
      buffer = '';

      onError({
        type: 'MESSAGE_TOO_LARGE',
        message: 'El mensaje supera el tamaño máximo permitido.'
      });
    }
  };

  const addChunk = (chunk) => {
    buffer += chunk.toString('utf8');
    processBuffer();
  };

  const reset = () => {
    buffer = '';
  };

  return {
    addChunk,
    reset
  };
};
