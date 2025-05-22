async function sendResponse({
  status,
  statusCode,
  message,
  payload,
  res,
  errors,
}) {
  const success = status === "success";

  const responseData = {
    status,
    success,
    message,
    data: payload,
    statusCode,
    errors,
  };
  res.status(responseData.statusCode).json(responseData);
}

export default sendResponse;
