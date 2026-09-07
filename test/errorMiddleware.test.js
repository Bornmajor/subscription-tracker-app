const assert = require('node:assert/strict'); // Imports strict assertion helpers that fail a test when values do not match.
const test = require('node:test'); // Imports Node.js's built-in test runner.
const errorMiddleware = require('../src/middleware/errorMiddleware'); // Imports the central error middleware being tested.

function runErrorMiddleware(error) { // Defines a helper that runs error middleware with simulated Express response objects.
  const result = {}; // Creates an object that will capture the response sent by the middleware.
  const res = { // Creates the minimal response object needed by this middleware.
    status: (statusCode) => { // Captures the status code and returns the object that supports .json().
      result.statusCode = statusCode; // Saves the status code for the assertion after middleware finishes.
      return { // Returns the response fragment used by Express's chained res.status().json() syntax.
        json: (body) => { // Captures the JSON body sent by the middleware.
          result.body = body; // Saves the response body for the assertion after middleware finishes.
        }, // Ends the simulated json method.
      }; // Ends the chained response fragment.
    }, // Ends the simulated status method.
  }; // Ends the simulated response object.

  errorMiddleware(error, {}, res, () => {}); // Runs the actual application error middleware with simulated Express arguments.
  return result; // Returns the captured response to the individual test.
} // Ends the error-middleware runner helper.

test('error middleware returns Bad Request for Mongoose validation errors', () => { // Defines the test for invalid client data detected by Mongoose.
  const error = { // Creates the minimum shape of a Mongoose validation error.
    name: 'ValidationError', // Marks this simulated error as a Mongoose validation failure.
    message: 'Subscription validation failed.', // Supplies the message expected by the API client.
  }; // Ends the simulated validation error.
  const result = runErrorMiddleware(error); // Runs the central error middleware with the validation error.

  assert.equal(result.statusCode, 400); // Confirms that invalid client data becomes a Bad Request response.
  assert.equal(result.body.message, 'Subscription validation failed.'); // Confirms that the validation message reaches the client.
}); // Ends the validation-error test.

test('error middleware returns Internal Server Error for unexpected errors', () => { // Defines the test for an unexpected application or database failure.
  const originalConsoleError = console.error; // Saves the real logging function before replacing it during this focused test.
  console.error = () => {}; // Silences the expected test log while confirming the response behavior.

  try { // Ensures that the real logging function is restored even if an assertion fails.
    const result = runErrorMiddleware(new Error('Database connection failed.')); // Runs middleware with an error that has no client-error status.

    assert.equal(result.statusCode, 500); // Confirms that an unexpected error becomes an Internal Server Error response.
    assert.equal(result.body.message, 'Database connection failed.'); // Confirms that the API returns the available error message.
  } finally { // Runs after the assertions whether they pass or fail.
    console.error = originalConsoleError; // Restores the server's real error logger for other tests and application code.
  } // Ends the logger-restoration block.
}); // Ends the unexpected-error test.
