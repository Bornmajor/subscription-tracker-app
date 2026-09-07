const Subscription = require('../models/Subscription'); // Imports the model used to read and change subscription documents in MongoDB.

async function createSubscription(req, res, next) { // Defines the controller that creates one subscription from the request body.
  try { // Begins error handling for the asynchronous database operation.
    const subscription = await Subscription.create(req.body); // Validates the request data and saves a new subscription document.

    res.status(201).json({ // Sets the Created HTTP status and starts the JSON response.
      message: 'Subscription created successfully.', // Gives the API client a clear result message.
      subscription, // Returns the newly created subscription, including its MongoDB-generated ID.
    }); // Ends and sends the create response.
  } catch (error) { // Receives validation or database errors thrown while creating the document.
    next(error); // Passes the error to the central error middleware.
  } // Ends the error-handling block.
} // Ends the create-subscription controller.

async function getSubscriptions(req, res, next) { // Defines the controller that fetches every subscription.
  try { // Begins error handling for the asynchronous database operation.
    const subscriptions = await Subscription.find(); // Queries MongoDB for all subscription documents.

    res.status(200).json({ // Sets the successful HTTP status and starts the JSON response.
      subscriptions, // Returns the array of matching subscription documents.
    }); // Ends and sends the fetch response.
  } catch (error) { // Receives a database error thrown while reading documents.
    next(error); // Passes the error to the central error middleware.
  } // Ends the error-handling block.
} // Ends the get-subscriptions controller.

async function getSubscriptionById(req, res, next) { // Defines the controller that fetches one subscription identified by the URL ID.
  try { // Begins error handling for the asynchronous database operation.
    const subscription = await Subscription.findById(req.params.id); // Queries MongoDB for the subscription with the ID from the route URL.

    if (!subscription) { // Checks whether MongoDB found a subscription with the supplied ID.
      return res.status(404).json({ // Stops the controller and sets the Not Found HTTP status.
        message: 'Subscription not found.', // Explains that no subscription exists with this ID.
      }); // Ends and sends the not-found response.
    } // Ends the missing-subscription check.

    res.status(200).json({ // Sets the successful HTTP status and starts the JSON response.
      subscription, // Returns the matching subscription document.
    }); // Ends and sends the fetch-one response.
  } catch (error) { // Receives an invalid-ID or database error thrown while finding the subscription.
    next(error); // Passes the error to the central error middleware.
  } // Ends the error-handling block.
} // Ends the get-one-subscription controller.

async function updateSubscription(req, res, next) { // Defines the controller that changes one subscription identified by the URL ID.
  try { // Begins error handling for the asynchronous database operation.
    const subscription = await Subscription.findByIdAndUpdate( // Finds the document identified by req.params.id and applies request-body changes.
      req.params.id, // Supplies the subscription ID from the :id part of the route URL.
      req.body, // Supplies the fields that the client wants to change.
      {
        returnDocument: 'after', // Returns the updated document instead of returning its previous version.
        runValidators: true, // Applies the Subscription schema validation rules to the changed fields.
      }, // Ends the update options.
    ); // Ends the find-and-update database operation.

    if (!subscription) { // Checks whether MongoDB found a subscription with the supplied ID.
      return res.status(404).json({ // Stops the controller and sets the Not Found HTTP status.
        message: 'Subscription not found.', // Explains that no subscription exists with this ID.
      }); // Ends and sends the not-found response.
    } // Ends the missing-subscription check.

    res.status(200).json({ // Sets the successful HTTP status and starts the JSON response.
      message: 'Subscription updated successfully.', // Gives the API client a clear result message.
      subscription, // Returns the updated subscription document.
    }); // Ends and sends the update response.
  } catch (error) { // Receives validation, invalid-ID, or database errors thrown while updating.
    next(error); // Passes the error to the central error middleware.
  } // Ends the error-handling block.
} // Ends the update-subscription controller.

async function deleteSubscription(req, res, next) { // Defines the controller that removes one subscription identified by the URL ID.
  try { // Begins error handling for the asynchronous database operation.
    const subscription = await Subscription.findByIdAndDelete(req.params.id); // Finds and permanently deletes the subscription with the URL ID.

    if (!subscription) { // Checks whether MongoDB found a subscription with the supplied ID.
      return res.status(404).json({ // Stops the controller and sets the Not Found HTTP status.
        message: 'Subscription not found.', // Explains that no subscription exists with this ID.
      }); // Ends and sends the not-found response.
    } // Ends the missing-subscription check.

    res.status(200).json({ // Sets the successful HTTP status and starts the JSON response.
      message: 'Subscription deleted successfully.', // Gives the API client a clear result message.
    }); // Ends and sends the delete response.
  } catch (error) { // Receives an invalid-ID or database error thrown while deleting.
    next(error); // Passes the error to the central error middleware.
  } // Ends the error-handling block.
} // Ends the delete-subscription controller.

module.exports = { // Exports all four controllers so the route file can connect URLs to them.
  createSubscription, // Exports the controller for POST requests.
  getSubscriptions, // Exports the controller for GET requests.
  getSubscriptionById, // Exports the controller for GET requests that include one subscription ID.
  updateSubscription, // Exports the controller for PUT requests.
  deleteSubscription, // Exports the controller for DELETE requests.
}; // Ends the exported controller object.
