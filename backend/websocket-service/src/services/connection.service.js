import { getUserSockets } from '../stores/socket.store.js';

export const createConnectionService = (io) => {
  const sendToUser = (userId, event, data) => {
    const socketIds = getUserSockets(userId).filter((socketId) =>
      io.sockets.sockets.has(socketId)
    );

    if (socketIds.length === 0) {
      return false;
    }

    socketIds.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });

    return true;
  };

  const sendToUsers = (userIds, event, data) => {
    userIds.forEach((userId) => {
      sendToUser(userId, event, data);
    });
  };

  const sendToSocket = (socketId, event, data) => {
    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
      return false;
    }

    socket.emit(event, data);

    return true;
  };

  const isUserConnected = (userId) => {
    return getUserSockets(userId).length > 0;
  };

  return {
    sendToUser,
    sendToUsers,
    sendToSocket,
    isUserConnected
  };
};
