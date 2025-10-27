// Vercel serverless entrypoint for the Express app
// Export the Express app function directly for @vercel/node
const app = require('../server');

module.exports = (req, res) => app(req, res);