export const successResponse = (
  res,
  message,
  data = null,
  statusCode = 200,
  extra = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
};

export const errorResponse = (
  res,
  error,
  message = null,
  statusCode = 500
) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
  });
};
