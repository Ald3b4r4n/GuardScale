// Vercel serverless entrypoint for the Express app (root /api)
const app = require('../server');

module.exports = (req, res) => app(req, res);