const Subscription = require('../models/Subscription'); // Imports the model used to read and change subscription documents in MongoDB.

const WRITABLE_FIELDS = ['name', 'price', 'billingCycle', 'nextPaymentDate', 'category']; // Lists the only fields a client may set directly.

function pickWritableFields(body = {}) { // Copies only the client-writable fields from a request body.
  const fields = {}; // Starts with an empty object so unknown or protected fields are never copied.
  for (const field of WRITABLE_FIELDS) { // Visits each field that clients are allowed to write.
    if (body[field] !== undefined) fields[field] = body[field]; // Keeps a field only when the client sent it, which keeps PUT partial.
  } // Ends the writable-field loop.
  return fields; // Returns the safe subset; _id, updatedAt, and other protected fields are excluded.
} // Ends the writable-field helper.

function badRequest(message) { // Creates an error the central error middleware will turn into a 400 response.
  const error = new Error(message); // Creates the error with a client-facing message.
  error.statusCode = 400; // Marks the error as caused by invalid client input.
  return error; // Returns the error so the caller can pass it to next().
} // Ends the bad-request helper.

function readClientChangeTime(body = {}) { // Reads WHEN the client made its change, used for last-write-wins.
  if (body.updatedAt === undefined) return new Date(); // Treats clients that send no time, such as the dashboard, as changing the record now.
  const changeTime = new Date(body.updatedAt); // Converts the client's ISO date text into a Date.
  if (Number.isNaN(changeTime.getTime())) throw badRequest('updatedAt must be a valid date.'); // Rejects unreadable times instead of storing an invalid date.
  return changeTime; // Returns the client's change time.
} // Ends the client-change-time helper.

async function createSubscription(req, res, next) { // Defines the controller that creates one subscription from the request body.
  try { // Begins error handling for the asynchronous database operation.
    const subscription = await Subscription.create(pickWritableFields(req.body)); // Validates only the writable fields and saves a new subscription with a server-generated UUID.

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

async function upsertSubscription(req, res, next) { // Defines the controller that creates OR updates the subscription identified by the URL ID.
  try { // Begins error handling for the asynchronous database operation.
    const { id } = req.params; // Uses the URL ID, which offline clients generate themselves; any _id in the body is ignored.
    const changeTime = readClientChangeTime(req.body); // Reads when the client made this change, for last-write-wins.
    const fields = pickWritableFields(req.body); // Copies only the fields a client may write.
    const existing = await Subscription.findById(id); // Looks for a subscription that already uses this ID.

    if (!existing) { // Handles an ID the server has never seen: the client created this record, possibly while offline.
      const created = await Subscription.create({ ...fields, _id: id, updatedAt: changeTime }); // Saves the record under the CLIENT's ID, so a retried request finds it instead of creating a duplicate.
      return res.status(201).json({ // Sets the Created HTTP status and starts the JSON response.
        message: 'Subscription created successfully.', // Gives the API client a clear result message.
        subscription: created, // Returns the stored subscription.
        applied: true, // Tells sync clients their change was saved.
      }); // Ends and sends the create response.
    } // Ends the create branch.

    if (existing.updatedAt > changeTime) { // Detects a conflict: the server already holds a NEWER change than this one.
      return res.status(200).json({ // Responds successfully because nothing is wrong with the request itself.
        message: 'A newer version already exists; the change was not applied.', // Explains why the data did not change.
        subscription: existing, // Returns the newer server version so the client can replace its stale copy.
        applied: false, // Tells sync clients their change lost under last-write-wins.
      }); // Ends and sends the not-applied response.
    } // Ends the conflict check.

    Object.assign(existing, fields, { updatedAt: changeTime }); // Applies the sent fields and records the client's change time.
    await existing.save(); // Validates the changed document against the schema and stores it.

    res.status(200).json({ // Sets the successful HTTP status and starts the JSON response.
      message: 'Subscription updated successfully.', // Gives the API client a clear result message.
      subscription: existing, // Returns the updated subscription document.
      applied: true, // Tells sync clients their change was saved.
    }); // Ends and sends the update response.
  } catch (error) { // Receives validation, bad-input, or database errors thrown while saving.
    next(error); // Passes the error to the central error middleware.
  } // Ends the error-handling block.
} // Ends the upsert-subscription controller.

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

module.exports = { // Exports all five controllers so the route file can connect URLs to them.
  createSubscription, // Exports the controller for POST requests.
  getSubscriptions, // Exports the controller for GET requests.
  getSubscriptionById, // Exports the controller for GET requests that include one subscription ID.
  upsertSubscription, // Exports the controller for PUT requests, which create or update by ID.
  deleteSubscription, // Exports the controller for DELETE requests.
}; // Ends the exported controller object.
