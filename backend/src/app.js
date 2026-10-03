const express = require('express');
const cors = require('cors');
const analyzeRoutes = require('./routes/analyzeRoutes');

const app = express();

// Determine allowed origins from environment or default presets
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || process.env.CORS_ORIGIN || '';
const configuredOrigins = allowedOriginsEnv
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Default development origins
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools, curl, mobile apps, or same-origin requests (where origin is undefined)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow all if configured with wildcard '*'
    if (configuredOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check against explicitly configured and default origins
    if (configuredOrigins.includes(normalizedOrigin) || defaultOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Automatically allow any Vercel deployment (preview or production *.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_\-.]+\.vercel\.app$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // Automatically allow Render deployments (*.onrender.com)
    if (/^https:\/\/[a-zA-Z0-9_\-.]+\.onrender\.com$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'FlowSight Analysis API' });
});

// Mount analysis routes
app.use('/api', analyzeRoutes);

module.exports = app;
