export const createMessageParser = (onMessage, onError = () => {}) => {
  let buffer = '';

  const addChunk = (chunk) => {
    buffer += chunk;

    let separatorIndex;

    while ((separatorIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, separatorIndex).trim();

      buffer = buffer.slice(separatorIndex + 1);

      if (!line) continue;

      try {
        const message = JSON.parse(line);

        onMessage(message);
      } catch (error) {
        onError({
          type: 'MESSAGE_PARSE_ERROR',
          message: error.message
        });
      }
    }
  };

  const reset = () => {
    buffer = '';
  };

  return {
    addChunk,
    reset
  };
};