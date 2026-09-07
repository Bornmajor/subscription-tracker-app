require('dotenv').config(); // Loads MONGODB_TEST_URI before the test database helpers connect.

const assert = require('node:assert/strict'); // Imports strict assertion helpers that fail a test when values do not match.
const test = require('node:test'); // Imports Node.js's built-in test runner.
const Subscription = require('../src/models/Subscription'); // Imports the Mongoose model whose schema validation is being tested.
const { // Starts importing the database lifecycle helpers used by this test suite.
  connectTestDatabase, // Imports the helper that connects to the dedicated test database.
  clearTestDatabase, // Imports the helper that removes temporary test data.
  disconnectTestDatabase, // Imports the helper that closes the test database connection.
} = require('../test-support/database'); // Ends the database-helper import.

test.before(async () => { // Runs once before this file's tests begin.
  await connectTestDatabase(); // Connects Mongoose to subscription-tracker-test rather than the normal application database.
  await clearTestDatabase(); // Ensures this test file starts with no leftover documents.
}); // Ends the before-test hook.

test.after(async () => { // Runs once after this file's tests finish, even when a test fails.
  await clearTestDatabase(); // Removes documents created by this test file.
  await disconnectTestDatabase(); // Closes Mongoose so the test process can finish.
}); // Ends the after-test hook.

test('Subscription model accepts valid subscription data', async () => { // Defines the test for a document that meets every schema rule.
  const subscription = new Subscription({ // Creates an unsaved subscription containing valid data.
    name: 'Netflix', // Provides a required non-empty name.
    price: 15.49, // Provides a positive price.
    billingCycle: 'monthly', // Provides one of the two allowed billing-cycle values.
    nextPaymentDate: '2026-10-07', // Provides a date Mongoose can parse.
    category: 'entertainment', // Provides a required category.
  }); // Ends the valid subscription data.

  await subscription.validate(); // Asks Mongoose to apply the actual Subscription schema validation rules.
  assert.equal(subscription.name, 'Netflix'); // Confirms that validation retained the expected document data.
}); // Ends the valid-data test.

test('Subscription model rejects invalid field values', async () => { // Defines the test for data that violates multiple schema rules.
  const subscription = new Subscription({ // Creates an unsaved subscription containing invalid data.
    name: 'Netflix', // Provides a valid name so the test focuses on the fields below.
    price: 0, // Violates the rule requiring a price greater than zero.
    billingCycle: 'weekly', // Violates the rule allowing only monthly or yearly billing.
    nextPaymentDate: 'not-a-date', // Violates the rule requiring a valid date.
    category: 'entertainment', // Provides a valid category so the test focuses on the fields above.
  }); // Ends the invalid subscription data.

  await assert.rejects(subscription.validate(), (error) => { // Confirms that Mongoose rejects the invalid document and exposes field-specific errors.
    assert.ok(error.errors.price); // Confirms that the invalid price is reported.
    assert.ok(error.errors.billingCycle); // Confirms that the invalid billing cycle is reported.
    assert.ok(error.errors.nextPaymentDate); // Confirms that the invalid payment date is reported.
    return true; // Tells assert.rejects that this validation error is the expected rejection.
  }); // Ends the invalid-data rejection assertion.
}); // Ends the invalid-data test.
