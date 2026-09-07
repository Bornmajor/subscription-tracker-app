function notFoundMiddleware(req, res) { // Defines middleware Express calls when no earlier route matched the request.
  res.status(404).json({ // Sets the HTTP response status to 404, meaning the requested resource was not found.
    message: `Route not found: ${req.method} ${req.originalUrl}`, // Includes the request method and URL to make the mistake easy to identify.
  }); // Finishes and sends the JSON response.
} // Ends the not-found middleware function.

module.exports = notFoundMiddleware; // Makes this middleware available to app.js.
