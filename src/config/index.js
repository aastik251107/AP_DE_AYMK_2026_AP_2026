// ============================================================================
// ⚙️ APPLICATION CONFIGURATION (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/config/index.js
// ============================================================================
// 💡 WHY CENTRALIZED CONFIGURATION?
// Instead of calling `process.env.XYZ` in 20 different files where typos can occur,
// we gather all environment variables in this ONE central file.
//
// 💡 WHAT DOES dotenv DO?
// Node.js doesn't natively read `.env` files. The `dotenv` package reads the `.env`
// file from the project root and loads its variables into Node's `process.env`!
// ============================================================================

const path = require('path');

// Load environment variables from the root .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  // Port on which the Express HTTP server will listen (Default: 5000)
  port: process.env.PORT || 5000,

  // Environment mode: 'development' or 'production'
  nodeEnv: process.env.NODE_ENV || 'development',

  // Secret key used to sign and verify JSON Web Tokens (JWT)
  // 💡 WHY SECRET? If an attacker knows this key, they can forge fake admin tokens!
  jwtSecret: process.env.JWT_SECRET || 'land_acquisition_jwt_super_secret_key_2026_aymk',

  // How long a JWT remains valid before expiring (7 days)
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Secret key used by cookie-parser to sign and tamper-proof HTTP cookies
  cookieSecret: process.env.COOKIE_SECRET || 'land_acquisition_cookie_secret_key_2026',

  // Cross-Origin Resource Sharing origin (* allows requests from any domain/port in dev)
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
