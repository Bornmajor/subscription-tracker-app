const apiKeyInput = document.querySelector('#api-key-input'); // Selects the field where the administrator enters the API key.
const saveApiKeyButton = document.querySelector('#save-api-key-button'); // Selects the button that stores the current API key for this browser tab.
const refreshButton = document.querySelector('#refresh-button'); // Selects the button that reloads the subscription list.
const statusMessage = document.querySelector('#status-message'); // Selects the accessible area used to display success and error messages.
const subscriptionForm = document.querySelector('#subscription-form'); // Selects the form used for both creating and editing subscriptions.
const formTitle = document.querySelector('#form-title'); // Selects the form heading so it can describe the current form mode.
const submitButton = document.querySelector('#submit-button'); // Selects the form button so its label can match the current form mode.
const cancelEditButton = document.querySelector('#cancel-edit-button'); // Selects the button that exits edit mode without saving.
const subscriptionList = document.querySelector('#subscription-list'); // Selects the table body where subscription rows will be displayed.
const subscriptionCount = document.querySelector('#subscription-count'); // Selects the badge that displays the current number of subscriptions.
const emptyState = document.querySelector('#empty-state'); // Selects the text displayed when there are no subscriptions to show.

let editingSubscriptionId = null; // Stores the subscription ID being edited, or null while the form creates new subscriptions.

function getApiKey() { // Defines a helper that reads the API key for the current browser tab.
  return sessionStorage.getItem('subscriptionApiKey'); // Returns the temporary tab-only API key, or null when none has been saved.
} // Ends the API-key getter.

function setStatus(message, isError = false) { // Defines a helper that shows a status message with optional error styling.
  statusMessage.textContent = message; // Replaces any previous status text with the new message.
  statusMessage.classList.toggle('error', isError); // Adds error styling only when the message represents a failure.
} // Ends the status-message helper.

function formatDate(dateValue) { // Defines a helper that converts an API date value into a readable local date.
  const localDate = new Date(`${dateValue.slice(0, 10)}T00:00:00`); // Rebuilds the calendar date at local midnight so time zones cannot display the previous day.
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(localDate); // Formats the date using the visitor's language and region.
} // Ends the date-formatting helper.

function formatPrice(price) { // Defines a helper that displays a numeric price with two decimal places.
  return Number(price).toFixed(2); // Converts the price to a number and always displays two fraction digits.
} // Ends the price-formatting helper.

async function apiRequest(path, options = {}) { // Defines a helper that sends authorized requests to the Express API.
  const apiKey = getApiKey(); // Reads the API key that the administrator saved in this browser tab.

  if (!apiKey) { // Checks whether a key is available before starting a protected request.
    throw new Error('Enter and connect an API key before managing subscriptions.'); // Stops the request and explains how to proceed.
  } // Ends the missing-key check.

  const response = await fetch(`/api/subscriptions${path}`, { // Sends an HTTP request to one of the subscription API endpoints.
    ...options, // Keeps the method and body supplied by the calling function.
    headers: { // Creates the request headers required by the API.
      'Content-Type': 'application/json', // Tells Express that request bodies are formatted as JSON.
      'x-api-key': apiKey, // Supplies the shared key required by the server authorization middleware.
      ...options.headers, // Keeps any additional headers supplied by the calling function.
    }, // Ends the request-header object.
  }); // Ends the fetch configuration.
  const data = await response.json(); // Reads the JSON response body returned by the Express API.

  if (!response.ok) { // Checks whether the HTTP status represents an unsuccessful request.
    throw new Error(data.message || 'The API request failed.'); // Converts the API error message into a JavaScript error for the caller.
  } // Ends the unsuccessful-response check.

  return data; // Gives the successful response data back to the calling function.
} // Ends the API-request helper.

function resetForm() { // Defines a helper that returns the form from edit mode to create mode.
  editingSubscriptionId = null; // Clears the ID so form submission creates a new document.
  subscriptionForm.reset(); // Clears all values currently shown in the form fields.
  formTitle.textContent = 'Create subscription'; // Restores the form heading for creation mode.
  submitButton.textContent = 'Create subscription'; // Restores the form button label for creation mode.
  cancelEditButton.classList.add('hidden'); // Hides the cancel button because there is no active edit.
} // Ends the form-reset helper.

function beginEdit(subscription) { // Defines a helper that puts an existing subscription into the form for editing.
  editingSubscriptionId = subscription._id; // Records which subscription the next form submission should update.
  subscriptionForm.elements.name.value = subscription.name; // Copies the current name into the name field.
  subscriptionForm.elements.price.value = subscription.price; // Copies the current price into the price field.
  subscriptionForm.elements.billingCycle.value = subscription.billingCycle; // Selects the current billing cycle.
  subscriptionForm.elements.nextPaymentDate.value = subscription.nextPaymentDate.slice(0, 10); // Converts the API date to the YYYY-MM-DD format required by a date input.
  subscriptionForm.elements.category.value = subscription.category; // Copies the current category into the category field.
  formTitle.textContent = 'Edit subscription'; // Changes the heading to explain that the form will update a record.
  submitButton.textContent = 'Save changes'; // Changes the button label to describe the update action.
  cancelEditButton.classList.remove('hidden'); // Shows the cancel button so the administrator can exit edit mode.
  subscriptionForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Brings the populated form into view on smaller screens.
} // Ends the edit-mode helper.

function createCell(row, value) { // Defines a helper that safely adds one text cell to a subscription table row.
  const cell = document.createElement('td'); // Creates an empty table data cell element.
  cell.textContent = value; // Inserts plain text so subscription content cannot be interpreted as HTML.
  row.append(cell); // Adds the completed cell to the current table row.
} // Ends the table-cell helper.

function renderSubscriptions(subscriptions) { // Defines a helper that redraws the subscription table from API data.
  subscriptionList.replaceChildren(); // Removes every previously displayed table row before rendering fresh data.
  subscriptionCount.textContent = subscriptions.length; // Updates the count badge with the number of returned subscriptions.
  emptyState.classList.toggle('hidden', subscriptions.length > 0); // Hides the empty-state message whenever at least one subscription exists.
  emptyState.textContent = 'No subscriptions exist yet. Create your first subscription using the form.'; // Restores the normal empty-state message after a successful API response.

  for (const subscription of subscriptions) { // Visits each subscription so the dashboard can render one row for it.
    const row = document.createElement('tr'); // Creates an empty table row for the current subscription.
    createCell(row, subscription.name); // Adds the service name cell.
    createCell(row, formatPrice(subscription.price)); // Adds the formatted price cell.
    createCell(row, subscription.billingCycle); // Adds the billing-cycle cell.
    createCell(row, formatDate(subscription.nextPaymentDate)); // Adds the readable next-payment-date cell.
    createCell(row, subscription.category); // Adds the category cell.

    const actionsCell = document.createElement('td'); // Creates the final table cell that holds action buttons.
    const editButton = document.createElement('button'); // Creates a button for entering edit mode.
    editButton.type = 'button'; // Prevents the edit button from accidentally submitting the form.
    editButton.textContent = 'Edit'; // Gives the edit button visible text.
    editButton.addEventListener('click', () => beginEdit(subscription)); // Starts editing this subscription when the button is clicked.

    const deleteButton = document.createElement('button'); // Creates a button for deleting the current subscription.
    deleteButton.type = 'button'; // Prevents the delete button from accidentally submitting the form.
    deleteButton.className = 'danger-button'; // Applies the red destructive-action button styling.
    deleteButton.textContent = 'Delete'; // Gives the delete button visible text.
    deleteButton.addEventListener('click', () => deleteSubscription(subscription)); // Deletes this subscription when the button is clicked.

    actionsCell.append(editButton, deleteButton); // Places both action buttons inside the actions table cell.
    row.append(actionsCell); // Adds the actions cell to the current subscription row.
    subscriptionList.append(row); // Adds the completed subscription row to the table body.
  } // Ends the subscription-rendering loop.
} // Ends the subscription-rendering helper.

async function loadSubscriptions() { // Defines a function that fetches and displays all subscriptions.
  try { // Begins error handling for the asynchronous API request.
    setStatus('Loading subscriptions...'); // Informs the administrator that a request is in progress.
    const data = await apiRequest(''); // Requests all subscriptions from GET /api/subscriptions.
    renderSubscriptions(data.subscriptions); // Draws the subscription rows returned by the API.
    setStatus(`Loaded ${data.subscriptions.length} subscription${data.subscriptions.length === 1 ? '' : 's'}.`); // Reports how many records the API returned.
  } catch (error) { // Receives missing-key, network, authorization, or server errors.
    renderSubscriptions([]); // Clears stale table data when the current request did not succeed.
    emptyState.textContent = 'Unable to load subscriptions. Connect with a valid API key and try again.'; // Explains why the list is empty.
    setStatus(error.message, true); // Displays the error message with error styling.
  } // Ends the error-handling block.
} // Ends the subscription-loading function.

async function deleteSubscription(subscription) { // Defines a function that deletes one subscription after administrator confirmation.
  const shouldDelete = window.confirm(`Delete ${subscription.name}? This action cannot be undone.`); // Opens a confirmation dialog to prevent accidental deletion.

  if (!shouldDelete) { // Checks whether the administrator cancelled the confirmation dialog.
    return; // Stops without sending a delete request.
  } // Ends the cancellation check.

  try { // Begins error handling for the asynchronous API request.
    const data = await apiRequest(`/${subscription._id}`, { method: 'DELETE' }); // Requests deletion from DELETE /api/subscriptions/:id.
    setStatus(data.message); // Shows the successful deletion message returned by the API.

    if (editingSubscriptionId === subscription._id) { // Checks whether the deleted item was currently being edited.
      resetForm(); // Exits edit mode because that record no longer exists.
    } // Ends the active-edit check.

    await loadSubscriptions(); // Reloads the table so it no longer displays the deleted record.
  } catch (error) { // Receives missing-key, network, authorization, or server errors.
    setStatus(error.message, true); // Displays the error message with error styling.
  } // Ends the error-handling block.
} // Ends the delete-subscription function.

saveApiKeyButton.addEventListener('click', () => { // Runs whenever the administrator presses the Connect button.
  const apiKey = apiKeyInput.value.trim(); // Reads the entered key and removes accidental surrounding whitespace.

  if (!apiKey) { // Checks whether the administrator left the key field empty.
    setStatus('Enter an API key before connecting.', true); // Explains why the dashboard cannot connect yet.
    return; // Stops without changing the previously saved key.
  } // Ends the empty-key check.

  sessionStorage.setItem('subscriptionApiKey', apiKey); // Stores the key only for this browser tab instead of permanently on the device.
  apiKeyInput.value = ''; // Clears the visible password field after the key has been stored.
  setStatus('API key saved for this browser tab.'); // Confirms that protected requests can now be sent.
  loadSubscriptions(); // Immediately requests the current subscription list with the new key.
}); // Ends the Connect-button listener.

refreshButton.addEventListener('click', loadSubscriptions); // Reloads subscriptions when the administrator presses Refresh subscriptions.
cancelEditButton.addEventListener('click', resetForm); // Returns the form to create mode when the administrator cancels an edit.

subscriptionForm.addEventListener('submit', async (event) => { // Runs whenever the administrator submits the create-or-edit form.
  event.preventDefault(); // Prevents the browser from reloading the page after form submission.

  const formData = new FormData(subscriptionForm); // Reads the current values from every named form field.
  const subscriptionData = { // Creates the JSON object expected by the Express API.
    name: formData.get('name'), // Uses the entered subscription name.
    price: Number(formData.get('price')), // Converts the price text into a JavaScript number.
    billingCycle: formData.get('billingCycle'), // Uses the selected monthly or yearly billing cycle.
    nextPaymentDate: formData.get('nextPaymentDate'), // Uses the selected next-payment date.
    category: formData.get('category'), // Uses the entered category label.
  }; // Ends the subscription-data object.
  const isEditing = Boolean(editingSubscriptionId); // Records whether this submission updates an existing record or creates a new one.
  const path = isEditing ? `/${editingSubscriptionId}` : ''; // Uses an ID URL only when the request updates an existing subscription.
  const method = isEditing ? 'PUT' : 'POST'; // Selects the matching HTTP method for an update or creation.

  try { // Begins error handling for the asynchronous API request.
    const data = await apiRequest(path, { // Sends the subscription data to the appropriate protected API endpoint.
      method, // Supplies POST for creation or PUT for an update.
      body: JSON.stringify(subscriptionData), // Converts the JavaScript data object into a JSON request body.
    }); // Ends the API request.
    setStatus(data.message); // Shows the successful creation or update message returned by the API.
    resetForm(); // Clears the form and returns it to create mode.
    await loadSubscriptions(); // Reloads the table to display the newly saved data.
  } catch (error) { // Receives missing-key, network, authorization, validation, or server errors.
    setStatus(error.message, true); // Displays the error message with error styling.
  } // Ends the error-handling block.
}); // Ends the form-submit listener.

const storedApiKey = getApiKey(); // Reads a key that may already exist from an earlier visit in this browser tab.

if (storedApiKey) { // Checks whether the administrator already connected during this tab session.
  setStatus('Saved API key found. Loading subscriptions...'); // Explains why the dashboard will immediately load data.
  loadSubscriptions(); // Loads subscriptions without requiring the key to be entered again.
} // Ends the stored-key check.
