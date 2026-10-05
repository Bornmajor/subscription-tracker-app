require('dotenv').config({ quiet: true }); // Loads API_KEY and MONGODB_TEST_URI before the app and database helpers are used.

const assert = require('node:assert/strict'); // Imports strict assertion helpers that fail a test when values do not match.
const { once } = require('node:events'); // Imports a helper that waits for the HTTP server's listening event.
const test = require('node:test'); // Imports Node.js's built-in test runner.
const app = require('../src/app'); // Imports the fully configured Express application with routes and middleware.
const Subscription = require('../src/models/Subscription'); // Imports the model so tests can inspect stored documents directly.
const { // Starts importing the database lifecycle helpers used by this integration-test suite.
  connectTestDatabase, // Imports the helper that connects to the dedicated test database.
  clearTestDatabase, // Imports the helper that removes temporary test data.
  disconnectTestDatabase, // Imports the helper that closes the test database connection.
} = require('../test-support/database'); // Ends the database-helper import.

let server; // Holds the temporary HTTP server created for these tests.
let baseUrl; // Holds the temporary server URL, including the operating-system-selected port.

const CLIENT_ID = '3f2b8c1e-6a4d-4f0e-9b7a-2c5d8e1f0a3b'; // Represents a UUID a mobile app generated while offline.

function validBody(overrides = {}) { // Builds a complete, valid subscription body that tests can adjust.
  return { // Returns the request body.
    name: 'Netflix', // Provides the required subscription name.
    price: 15.49, // Provides a valid positive price.
    billingCycle: 'monthly', // Provides an allowed billing cycle.
    nextPaymentDate: '2026-10-07', // Provides a valid payment date.
    category: 'entertainment', // Provides the required category.
    ...overrides, // Applies the test's own changes on top of the defaults.
  }; // Ends the request body.
} // Ends the valid-body helper.

async function put(id, body) { // Sends a PUT request with the API key and returns the status and parsed JSON.
  const response = await fetch(`${baseUrl}/api/subscriptions/${id}`, { // Sends the request to the temporary server.
    method: 'PUT', // Uses PUT, the create-or-update sync endpoint.
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.API_KEY }, // Supplies JSON content type and the API key.
    body: JSON.stringify(body), // Converts the body to JSON text.
  }); // Ends the request options.
  return { status: response.status, body: await response.json() }; // Returns the parts each test checks.
} // Ends the PUT helper.

test.before(async () => { // Runs once before this file's tests begin.
  await connectTestDatabase(); // Connects models to the dedicated test database.
  server = app.listen(0); // Starts Express on an automatically selected unused port.
  await once(server, 'listening'); // Waits until the temporary server is ready.
  baseUrl = `http://127.0.0.1:${server.address().port}`; // Builds the base address used by each request.
}); // Ends the before-test hook.

test.beforeEach(async () => { // Runs before every test in this file.
  await clearTestDatabase(); // Gives every test an empty database so tests cannot affect each other.
}); // Ends the before-each hook.

test.after(async () => { // Runs once after this file's tests finish, even when a test fails.
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))); // Stops the temporary HTTP server.
  await clearTestDatabase(); // Removes every document created by these tests.
  await disconnectTestDatabase(); // Closes Mongoose so the test process can finish.
}); // Ends the after-test hook.

test('PUT with a new ID creates the subscription under the client ID', async () => { // Tests creating a record the app made offline.
  const { status, body } = await put(CLIENT_ID, validBody()); // Sends the offline-created record to the server.

  assert.equal(status, 201); // Confirms that an unknown ID is created rather than rejected.
  assert.equal(body.applied, true); // Confirms the change was saved.
  assert.equal(body.subscription._id, CLIENT_ID); // Confirms that the server kept the client's ID.
}); // Ends the create-via-PUT test.

test('retrying the same PUT does not create a duplicate', async () => { // Tests the lost-response retry case.
  const changeTime = '2026-10-01T10:00:00.000Z'; // Uses one fixed change time, as a real retry would resend the same data.
  await put(CLIENT_ID, validBody({ updatedAt: changeTime })); // Sends the first attempt.
  const retry = await put(CLIENT_ID, validBody({ updatedAt: changeTime })); // Sends the identical retry.

  assert.equal(retry.status, 200); // Confirms the retry is treated as an update, not a new create.
  assert.equal(await Subscription.countDocuments(), 1); // Confirms that only one document exists.
}); // Ends the retry test.

test('a newer change is applied', async () => { // Tests a normal update under last-write-wins.
  await put(CLIENT_ID, validBody({ updatedAt: '2026-10-01T10:00:00.000Z' })); // Stores the original version.
  const { body } = await put(CLIENT_ID, { price: 17.99, updatedAt: '2026-10-02T10:00:00.000Z' }); // Sends a partial change made later.

  assert.equal(body.applied, true); // Confirms the newer change won.
  assert.equal(body.subscription.price, 17.99); // Confirms the price changed.
  assert.equal(body.subscription.name, 'Netflix'); // Confirms that fields not sent were left unchanged.
}); // Ends the newer-change test.

test('an older change is not applied and the newer server version is returned', async () => { // Tests a conflict lost by the client.
  await put(CLIENT_ID, validBody({ price: 20, updatedAt: '2026-10-05T10:00:00.000Z' })); // Stores a version changed on Oct 5.
  const { status, body } = await put(CLIENT_ID, { price: 9.99, updatedAt: '2026-10-03T10:00:00.000Z' }); // Sends an edit made earlier, on Oct 3, that arrives late.

  assert.equal(status, 200); // Confirms the request itself is not an error.
  assert.equal(body.applied, false); // Confirms the older change lost.
  assert.equal(body.subscription.price, 20); // Confirms the server returned its newer version.
  assert.equal((await Subscription.findById(CLIENT_ID)).price, 20); // Confirms the stored data was not overwritten.
}); // Ends the older-change test.

test('PUT without updatedAt (dashboard) counts as changed now', async () => { // Tests clients that do not send a change time.
  await put(CLIENT_ID, validBody({ updatedAt: '2026-01-01T00:00:00.000Z' })); // Stores a version with an old change time.
  const { body } = await put(CLIENT_ID, { price: 30 }); // Sends a change without updatedAt, like the dashboard.

  assert.equal(body.applied, true); // Confirms that "now" is newer than the stored change.
  assert.equal(body.subscription.price, 30); // Confirms the change was saved.
}); // Ends the no-updatedAt test.

test('PUT ignores protected fields in the body', async () => { // Tests that clients cannot overwrite server-controlled fields.
  const { body } = await put(CLIENT_ID, validBody({ _id: 'someone-else' })); // Tries to choose a different ID through the body.

  assert.equal(body.subscription._id, CLIENT_ID); // Confirms that the URL ID is used, not the body ID.
}); // Ends the protected-fields test.

test('PUT rejects incomplete new records and invalid change times', async () => { // Tests input validation on the sync endpoint.
  const incomplete = await put(CLIENT_ID, { name: 'Netflix' }); // Tries to create a record missing required fields.
  const badTime = await put(CLIENT_ID, validBody({ updatedAt: 'yesterday-ish' })); // Sends an unreadable change time.

  assert.equal(incomplete.status, 400); // Confirms a new record must be complete.
  assert.equal(badTime.status, 400); // Confirms invalid change times are rejected.
  assert.equal(badTime.body.message, 'updatedAt must be a valid date.'); // Confirms the error explains the problem.
}); // Ends the validation test.
