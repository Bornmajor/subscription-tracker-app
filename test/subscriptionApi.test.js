require('dotenv').config(); // Loads API_KEY and MONGODB_TEST_URI before the app and database helpers are used.

const assert = require('node:assert/strict'); // Imports strict assertion helpers that fail a test when values do not match.
const { once } = require('node:events'); // Imports a helper that waits for the HTTP server's listening event.
const test = require('node:test'); // Imports Node.js's built-in test runner.
const app = require('../src/app'); // Imports the fully configured Express application with routes and middleware.
const { // Starts importing the database lifecycle helpers used by this integration-test suite.
  connectTestDatabase, // Imports the helper that connects to the dedicated test database.
  clearTestDatabase, // Imports the helper that removes temporary test data.
  disconnectTestDatabase, // Imports the helper that closes the test database connection.
} = require('../test-support/database'); // Ends the database-helper import.

let server; // Holds the temporary HTTP server created for these API tests.
let baseUrl; // Holds the temporary server URL, including the operating-system-selected port.

function authorizedHeaders() { // Defines a helper that creates the headers needed for protected API requests.
  return { // Returns the shared request headers.
    'Content-Type': 'application/json', // Tells Express that request bodies are JSON.
    'x-api-key': process.env.API_KEY, // Supplies the correct API key from .env.
  }; // Ends the headers object.
} // Ends the authorized-headers helper.

async function request(path, options = {}) { // Defines a helper that sends requests to the temporary local HTTP server.
  return fetch(`${baseUrl}${path}`, options); // Uses Node.js fetch to make a real HTTP request to the Express app.
} // Ends the request helper.

test.before(async () => { // Runs once before this file's integration tests begin.
  await connectTestDatabase(); // Connects models to subscription-tracker-test instead of the normal application database.
  await clearTestDatabase(); // Ensures this test file starts with no leftover documents.
  server = app.listen(0); // Starts Express on an automatically selected unused port to avoid conflicts with the development server.
  await once(server, 'listening'); // Waits until the temporary server is ready to accept HTTP requests.
  const { port } = server.address(); // Reads the port selected by the operating system.
  baseUrl = `http://127.0.0.1:${port}`; // Builds the base address used by each test request.
}); // Ends the before-test hook.

test.after(async () => { // Runs once after this file's tests finish, even when a test fails.
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))); // Stops the temporary HTTP server cleanly.
  await clearTestDatabase(); // Removes every document created by these integration tests.
  await disconnectTestDatabase(); // Closes Mongoose so the test process can finish.
}); // Ends the after-test hook.

test('subscription routes reject a request without an API key', async () => { // Defines the authorization integration test.
  const response = await request('/api/subscriptions'); // Sends a protected route request without the required x-api-key header.
  const body = await response.json(); // Reads the JSON response sent by Express.

  assert.equal(response.status, 401); // Confirms that the complete route and middleware chain returns Unauthorized.
  assert.deepEqual(body, { message: 'An API key is required.' }); // Confirms that the API gives the expected authorization message.
}); // Ends the authorization integration test.

test('subscription routes create, fetch, update, and delete a subscription', async () => { // Defines an end-to-end CRUD test through real HTTP, Express, and MongoDB layers.
  const createResponse = await request('/api/subscriptions', { // Sends a request to create a subscription through the HTTP API.
    method: 'POST', // Uses POST because this request creates a new resource.
    headers: authorizedHeaders(), // Supplies the required API key and JSON content type.
    body: JSON.stringify({ // Converts the new subscription values into a JSON request body.
      name: 'Test Streaming Service', // Provides the required subscription name.
      price: 12.99, // Provides a valid positive price.
      billingCycle: 'monthly', // Provides an allowed billing cycle.
      nextPaymentDate: '2026-10-07', // Provides a valid payment date.
      category: 'testing', // Provides the required category.
    }), // Ends the new-subscription request body.
  }); // Ends the create request options.
  const createdBody = await createResponse.json(); // Reads the created subscription returned by the API.
  const subscriptionId = createdBody.subscription._id; // Stores the generated ID for the later fetch, update, and delete requests.

  assert.equal(createResponse.status, 201); // Confirms that a successful creation returns Created.
  assert.equal(createdBody.subscription.name, 'Test Streaming Service'); // Confirms that the API returns the saved subscription.

  const fetchAllResponse = await request('/api/subscriptions', { headers: authorizedHeaders() }); // Requests all subscriptions with valid authorization.
  const fetchAllBody = await fetchAllResponse.json(); // Reads the returned subscription list.

  assert.equal(fetchAllResponse.status, 200); // Confirms that fetching subscriptions succeeds.
  assert.equal(fetchAllBody.subscriptions.length, 1); // Confirms that the list contains the created test subscription.
  assert.equal(fetchAllBody.subscriptions[0]._id, subscriptionId); // Confirms that the created subscription appears in the list.

  const fetchOneResponse = await request(`/api/subscriptions/${subscriptionId}`, { headers: authorizedHeaders() }); // Requests the created subscription by its ID.
  const fetchOneBody = await fetchOneResponse.json(); // Reads the returned subscription document.

  assert.equal(fetchOneResponse.status, 200); // Confirms that fetching one existing subscription succeeds.
  assert.equal(fetchOneBody.subscription._id, subscriptionId); // Confirms that the requested subscription is returned.

  const updateResponse = await request(`/api/subscriptions/${subscriptionId}`, { // Sends a request to update the created subscription.
    method: 'PUT', // Uses PUT because this request changes an existing resource.
    headers: authorizedHeaders(), // Supplies the required API key and JSON content type.
    body: JSON.stringify({ price: 14.99 }), // Changes only the price field.
  }); // Ends the update request options.
  const updateBody = await updateResponse.json(); // Reads the updated subscription returned by the API.

  assert.equal(updateResponse.status, 200); // Confirms that the update succeeds.
  assert.equal(updateBody.subscription.price, 14.99); // Confirms that the changed price was saved.

  const deleteResponse = await request(`/api/subscriptions/${subscriptionId}`, { // Sends a request to remove the created subscription.
    method: 'DELETE', // Uses DELETE because this request removes an existing resource.
    headers: authorizedHeaders(), // Supplies the required API key.
  }); // Ends the delete request options.
  const deleteBody = await deleteResponse.json(); // Reads the deletion response sent by the API.

  assert.equal(deleteResponse.status, 200); // Confirms that deletion succeeds.
  assert.equal(deleteBody.message, 'Subscription deleted successfully.'); // Confirms that the API reports successful deletion.

  const missingResponse = await request(`/api/subscriptions/${subscriptionId}`, { headers: authorizedHeaders() }); // Requests the deleted ID to test the not-found controller path.
  const missingBody = await missingResponse.json(); // Reads the not-found response sent by the API.

  assert.equal(missingResponse.status, 404); // Confirms that an ID with no matching document returns Not Found.
  assert.equal(missingBody.message, 'Subscription not found.'); // Confirms that the API returns the expected missing-resource message.
}); // Ends the end-to-end CRUD test.

test('subscription routes return Bad Request for invalid data and IDs', async () => { // Defines the integration test for Mongoose validation and ID conversion failures.
  const invalidDataResponse = await request('/api/subscriptions', { // Sends a create request containing schema-invalid data.
    method: 'POST', // Uses POST because the request attempts to create a resource.
    headers: authorizedHeaders(), // Supplies the required API key and JSON content type.
    body: JSON.stringify({ // Converts the invalid subscription values into a JSON request body.
      name: 'Invalid Subscription', // Provides a valid name so the invalid fields below are isolated.
      price: 0, // Violates the positive-price validation rule.
      billingCycle: 'weekly', // Violates the monthly-or-yearly validation rule.
      nextPaymentDate: '2026-10-07', // Provides a valid date so the invalid fields above are isolated.
      category: 'testing', // Provides a valid category so the invalid fields above are isolated.
    }), // Ends the invalid request body.
  }); // Ends the invalid-data request options.
  const invalidDataBody = await invalidDataResponse.json(); // Reads the validation error response.

  assert.equal(invalidDataResponse.status, 400); // Confirms that schema-invalid client data returns Bad Request rather than Server Error.
  assert.match(invalidDataBody.message, /Subscription validation failed/); // Confirms that the response identifies the validation failure.

  const invalidIdResponse = await request('/api/subscriptions/not-a-mongodb-id', { headers: authorizedHeaders() }); // Sends a fetch-one request with an ID that Mongoose cannot parse.
  const invalidIdBody = await invalidIdResponse.json(); // Reads the invalid-ID error response.

  assert.equal(invalidIdResponse.status, 400); // Confirms that a malformed ID returns Bad Request.
  assert.match(invalidIdBody.message, /Cast to ObjectId failed/); // Confirms that the response identifies the invalid identifier.
}); // Ends the invalid-data-and-ID test.

test('unknown routes return Not Found', async () => { // Defines the integration test for the application's unknown-route middleware.
  const response = await request('/api/does-not-exist'); // Sends a request to a URL that no registered Express route handles.
  const body = await response.json(); // Reads the not-found JSON response.

  assert.equal(response.status, 404); // Confirms that an unknown URL returns Not Found.
  assert.equal(body.message, 'Route not found: GET /api/does-not-exist'); // Confirms that the response identifies the missing route.
}); // Ends the unknown-route test.
