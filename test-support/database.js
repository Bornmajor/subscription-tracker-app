const mongoose = require('mongoose'); // Imports the same Mongoose connection used by the application models.

async function connectTestDatabase() { // Defines a helper that connects the test suite to its dedicated MongoDB database.
  const testDatabaseUri = process.env.MONGODB_TEST_URI; // Reads the test-only database address from the environment configuration.

  if (!testDatabaseUri) { // Checks whether the required test database setting is missing.
    throw new Error('MONGODB_TEST_URI must be set before running tests.'); // Stops tests clearly rather than risking a connection to an unknown database.
  } // Ends the missing-setting check.

  await mongoose.connect(testDatabaseUri); // Opens the MongoDB connection that test models and controllers will use.
} // Ends the test-database connection helper.

async function clearTestDatabase() { // Defines a helper that removes all temporary test documents.
  await mongoose.connection.dropDatabase(); // Deletes the dedicated test database so one test run cannot affect the next.
} // Ends the test-database cleanup helper.

async function disconnectTestDatabase() { // Defines a helper that closes the MongoDB connection after a test suite finishes.
  await mongoose.disconnect(); // Releases the database connection so Node.js can exit cleanly.
} // Ends the test-database disconnection helper.

module.exports = { // Exports each database helper for use in test files.
  connectTestDatabase, // Exports the connection helper.
  clearTestDatabase, // Exports the cleanup helper.
  disconnectTestDatabase, // Exports the disconnection helper.
}; // Ends the exported helper object.
