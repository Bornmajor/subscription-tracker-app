const mongoose = require('mongoose'); // Imports Mongoose, which connects Node.js to MongoDB.

async function connectDatabase() { // Defines an asynchronous function because opening a database connection takes time.
  await mongoose.connect(process.env.MONGODB_URI); // Connects to the MongoDB address stored in the MONGODB_URI environment variable.
  console.log(`Connected to MongoDB: ${mongoose.connection.host}`); // Confirms the database host after Mongoose successfully connects.
} // Ends the database-connection function.

module.exports = connectDatabase; // Makes the connection function available to server.js.
