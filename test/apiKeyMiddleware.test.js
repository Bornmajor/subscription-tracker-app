require('dotenv').config(); // Loads the API key from .env before this test calls the authorization middleware.

const assert = require('node:assert/strict'); // Imports strict assertion helpers that fail a test when values do not match.
const test = require('node:test'); // Imports Node.js's built-in test runner.
const apiKeyMiddleware = require('../src/middleware/apiKeyMiddleware'); // Imports the middleware being tested.

function runMiddleware(apiKey) { // Defines a helper that runs the middleware with small simulated Express request and response objects.
  const result = {}; // Creates an object that will capture the middleware response or next-call result.
  const req = { // Creates the minimal request object needed by this middleware.
    get: () => apiKey, // Returns the supplied test API key whenever middleware reads the x-api-key header.
  }; // Ends the simulated request object.
  const res = { // Creates the minimal response object needed by this middleware.
    status: (statusCode) => { // Captures the response status code and returns the object that supports .json().
      result.statusCode = statusCode; // Saves the status code for the assertion after the middleware finishes.
      return { // Returns the response fragment used by Express's chained res.status().json() syntax.
        json: (body) => { // Captures the JSON body sent by the middleware.
          result.body = body; // Saves the response body for the assertion after the middleware finishes.
        }, // Ends the simulated json method.
      }; // Ends the chained response fragment.
    }, // Ends the simulated status method.
  }; // Ends the simulated response object.
  const next = () => { // Creates the next function normally supplied by Express.
    result.nextCalled = true; // Records that middleware allowed the request to continue.
  }; // Ends the simulated next function.

  apiKeyMiddleware(req, res, next); // Runs the actual application middleware with the simulated Express objects.
  return result; // Returns the captured result to the individual test.
} // Ends the middleware-runner helper.

test('API-key middleware rejects a request with no key', () => { // Defines the test for an absent x-api-key header.
  const result = runMiddleware(); // Runs middleware without providing an API key.

  assert.equal(result.statusCode, 401); // Confirms that a missing key returns Unauthorized.
  assert.deepEqual(result.body, { message: 'An API key is required.' }); // Confirms that the response explains the missing credential.
  assert.equal(result.nextCalled, undefined); // Confirms that an unauthorized request never reaches the route.
}); // Ends the missing-key test.

test('API-key middleware rejects a request with an invalid key', () => { // Defines the test for an incorrect x-api-key header.
  const result = runMiddleware('not-the-configured-key'); // Runs middleware with a deliberately incorrect API key.

  assert.equal(result.statusCode, 401); // Confirms that an invalid key returns Unauthorized.
  assert.deepEqual(result.body, { message: 'The API key is invalid.' }); // Confirms that the response explains the rejected credential.
  assert.equal(result.nextCalled, undefined); // Confirms that an unauthorized request never reaches the route.
}); // Ends the invalid-key test.

test('API-key middleware allows a request with the configured key', () => { // Defines the test for a valid x-api-key header.
  const result = runMiddleware(process.env.API_KEY); // Runs middleware with the API key loaded from .env.

  assert.equal(result.nextCalled, true); // Confirms that valid authorization allows Express to continue to the route.
  assert.equal(result.statusCode, undefined); // Confirms that middleware did not send an error response.
}); // Ends the valid-key test.
