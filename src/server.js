// Starts the HTTP server.

const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Land Acquisition System running at http://localhost:${PORT}`);
});
