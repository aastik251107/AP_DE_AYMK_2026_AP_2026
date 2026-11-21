// Configures Express middleware and mounts API routes.

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

// Create the Express application instance
const app = express();


app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true // Allow authentication cookies to travel across origins
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Reads the raw 'Cookie: auth_token=...' header and populates `req.cookies.auth_token`
app.use(cookieParser(config.cookieSecret));

app.use(loggerMiddleware);

// When you open http://localhost:5000 in a browser, Express serves `public/index.html`!
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1', routes);


app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
