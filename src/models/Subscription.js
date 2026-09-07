const mongoose = require('mongoose'); // Imports Mongoose so this file can define a MongoDB schema and model.

const subscriptionSchema = new mongoose.Schema( // Creates rules for the shape of every subscription document.
  {
    name: { // Defines the subscription service name, such as Netflix.
      type: String, // Requires the name value to be text.
      required: [true, 'Subscription name is required.'], // Rejects a subscription when its name is missing.
      trim: true, // Removes accidental whitespace from the beginning and end of the name.
    }, // Ends the name field configuration.
    price: { // Defines the amount charged for the subscription.
      type: Number, // Requires the price value to be a number.
      required: [true, 'Subscription price is required.'], // Rejects a subscription when its price is missing.
      min: [0.01, 'Subscription price must be greater than zero.'], // Rejects free, zero, and negative subscription prices.
    }, // Ends the price field configuration.
    billingCycle: { // Defines how often the subscription charges the customer.
      type: String, // Requires the billing cycle value to be text.
      required: [true, 'Billing cycle is required.'], // Rejects a subscription when its billing cycle is missing.
      enum: { // Limits the billing cycle to the values supported by this first version of the API.
        values: ['monthly', 'yearly'], // Allows only monthly and yearly billing.
        message: 'Billing cycle must be monthly or yearly.', // Explains why Mongoose rejects any other billing cycle.
      }, // Ends the allowed billing-cycle values.
    }, // Ends the billingCycle field configuration.
    nextPaymentDate: { // Defines the date when the subscription will next charge.
      type: Date, // Requires a value Mongoose can convert to a valid JavaScript date.
      required: [true, 'Next payment date is required.'], // Rejects a subscription when its next payment date is missing.
    }, // Ends the nextPaymentDate field configuration.
    category: { // Defines a grouping label, such as entertainment or productivity.
      type: String, // Requires the category value to be text.
      required: [true, 'Subscription category is required.'], // Rejects a subscription when its category is missing.
      trim: true, // Removes accidental whitespace from the beginning and end of the category.
    }, // Ends the category field configuration.
  }, // Ends the fields stored for each subscription.
  {
    timestamps: true, // Makes Mongoose automatically maintain createdAt and updatedAt date fields.
  }, // Ends the schema options.
); // Ends the Subscription schema definition.

const Subscription = mongoose.model('Subscription', subscriptionSchema); // Creates the model used to query and save subscriptions.

module.exports = Subscription; // Makes the Subscription model available to controllers later.
