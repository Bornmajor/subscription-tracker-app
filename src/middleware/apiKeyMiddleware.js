function apiKeyMiddleware(req, res, next) { // Defines middleware that Express runs before protected subscription controllers.
  const apiKey = req.get('x-api-key'); // Reads the x-api-key HTTP request header without caring about its letter casing.

  if (!apiKey) { // Checks whether the client omitted the API key completely.
    return res.status(401).json({ // Stops this request and sets the Unauthorized HTTP status.
      message: 'An API key is required.', // Explains how the client can correct the request.
    }); // Ends and sends the missing-key response.
  } // Ends the missing-key check.

  if (apiKey !== process.env.API_KEY) { // Checks whether the supplied key matches the server-only key stored in .env.
    return res.status(401).json({ // Stops this request and sets the Unauthorized HTTP status.
      message: 'The API key is invalid.', // Explains that the provided credential was not accepted.
    }); // Ends and sends the invalid-key response.
  } // Ends the invalid-key check.

  next(); // Gives Express permission to continue to the protected route or later middleware.
} // Ends the API-key middleware function.

module.exports = apiKeyMiddleware; // Makes this middleware available to the subscription routes.
