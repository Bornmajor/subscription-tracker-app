const express = require('express'); // Imports Express so this file can create a focused group of routes.
const apiKeyMiddleware = require('../middleware/apiKeyMiddleware'); // Imports the middleware that protects subscription endpoints with the shared API key.
const { // Starts importing the controller functions that contain each CRUD operation.
  createSubscription, // Imports the function that creates one subscription.
  getSubscriptions, // Imports the function that fetches all subscriptions.
  getSubscriptionById, // Imports the function that fetches one subscription by its ID.
  upsertSubscription, // Imports the function that creates or updates one subscription by its ID.
  deleteSubscription, // Imports the function that deletes one subscription by its ID.
} = require('../controllers/subscriptionController'); // Ends the controller-function import.

const router = express.Router(); // Creates a router used only for subscription-related URLs.

router.use(apiKeyMiddleware); // Requires a valid x-api-key header for every route defined below.

router.post('/', createSubscription); // Handles POST /api/subscriptions requests by creating a subscription.
router.get('/', getSubscriptions); // Handles GET /api/subscriptions requests by fetching all subscriptions.
router.get('/:id', getSubscriptionById); // Handles GET /api/subscriptions/:id requests by fetching one subscription.
router.put('/:id', upsertSubscription); // Handles PUT /api/subscriptions/:id by creating the subscription if the ID is new, otherwise updating it (last-write-wins).
router.delete('/:id', deleteSubscription); // Handles DELETE /api/subscriptions/:id requests by deleting one subscription.

module.exports = router; // Makes this subscription router available to app.js.
