import { ADMIN_ROOM } from '../protocols/message.types.js';

export const createAdminHandler = () => ({
  handleConnection: (socket) => {
    socket.join(ADMIN_ROOM);
    console.info(`INFO: Administrador conectado: ${socket.user.userId}`);

    socket.on('disconnect', (reason) => {
      console.info(
        `INFO: Administrador desconectado: ${socket.user.userId} (motivo: ${reason})`
      );
    });
  }
});
