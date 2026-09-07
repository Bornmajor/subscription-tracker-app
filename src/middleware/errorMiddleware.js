function errorMiddleware(error, req, res, next) { // Uses Express's four-parameter error-middleware signature so Express recognizes it as an error handler.
  let statusCode = error.statusCode || 500; // Uses a custom status when available, otherwise treats the error as an unexpected server failure.

  if (error.name === 'ValidationError' || error.name === 'CastError') { // Identifies Mongoose errors caused by invalid client-supplied data.
    statusCode = 400; // Marks invalid request data as a Bad Request instead of a server error.
  } // Ends the invalid-data error check.

  if (statusCode >= 500) { // Checks whether the error is an unexpected server failure rather than invalid client input.
    console.error(error); // Writes unexpected server errors to the terminal so they can be investigated.
  } // Ends the unexpected-server-error check.

  res.status(statusCode).json({ // Sends the status selected for this error as the HTTP response status.
    message: error.message || 'An unexpected server error occurred.', // Sends a safe error message as JSON to the API client.
  }); // Finishes and sends the JSON error response.
} // Ends the error middleware function.

module.exports = errorMiddleware; // Makes this middleware available to app.js.
