export const createConnectionHandler = ({
  driverHandler,
  customerHandler
}) => {
  const handleConnection = (socket) => {
    if (socket.user.role === 'DELIVERY_PERSON') {
      driverHandler.handleConnection(socket);
      return;
    }

    if (socket.user.role === 'CUSTOMER') {
      customerHandler.handleConnection(socket);
    }
  };

  return {
    handleConnection
  };
};