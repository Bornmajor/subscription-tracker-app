require('dotenv').config(); // Loads values from .env into process.env before the app reads them.

const app = require('./app'); // Imports the configured Express application.
const connectDatabase = require('./config/db'); // Imports the function that opens the MongoDB connection.

const port = process.env.PORT || 5000; // Uses PORT from .env, or 5000 if PORT is not set.

async function startServer() { // Defines the asynchronous startup sequence for the application.
  await connectDatabase(); // Waits for MongoDB so the API cannot accept requests without its required database.

  app.listen(port, () => { // Starts the HTTP server only after the database connection succeeds.
    console.log(`Server is running at http://localhost:${port}`); // Displays the local address in the terminal.
  }); // Ends the server-start callback.
} // Ends the server-start function.

startServer().catch((error) => { // Handles a startup failure that otherwise would become an unhandled promise rejection.
  console.error('Unable to start the server because MongoDB connection failed.'); // Explains why the API did not start.
  console.error(error); // Writes the complete connection error to the terminal for troubleshooting.
  process.exit(1); // Stops the process with a failure status instead of running without a database.
}); // Ends the startup-failure handler.
