const sockets = new Map();

export const addSocket = (userId, socketId, role) => {

  if (!sockets.has(userId)) {
    sockets.set(userId, {
      role,
      connections: new Set()
    });
  }

  const user = sockets.get(userId);

  user.connections.add(socketId);

  if (role === 'DRIVER') {
    console.info(`INFO: Repartidor conectado: ${userId}`);
  }

  return user;
};

export const removeSocket = (userId, socketId) => {
  const user = sockets.get(userId);

  if (!user) return false;

  user.connections.delete(socketId);

  if (user.connections.size === 0) {
    sockets.delete(userId);
  }

  return true;
};

export const getUserSockets = (userId) => {
  const user = sockets.get(userId);

  return user ? [...user.connections] : [];
};

export const getUser = (userId) => {
  return sockets.get(userId) || null;
};

export const hasUser = (userId) => {
  return sockets.has(userId);
};

export const getAllUsers = () => {
  return [...sockets.entries()].map(([userId, user]) => ({
    userId,
    role: user.role,
    connections: [...user.connections]
  }));
};

export const clearSockets = () => {
  sockets.clear();
};
