// Loads application configuration.

const path = require('path');

// Load environment variables from the root .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5000,

  nodeEnv: process.env.NODE_ENV || 'development',

  jwtSecret: process.env.JWT_SECRET || 'land_acquisition_jwt_super_secret_key_2026_aymk',

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  cookieSecret: process.env.COOKIE_SECRET || 'land_acquisition_cookie_secret_key_2026',

  corsOrigin: process.env.CORS_ORIGIN || '*'
};
