require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Route modules
const authRoutes = require('./routes/auth');
const zoneRoutes = require('./routes/zones');
const rateCardRoutes = require('./routes/ratecards');
const codConfigRoutes = require('./routes/codconfigs');
const orderRoutes = require('./routes/orders');
const agentRoutes = require('./routes/agents');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, Postman, mobile apps) or wildcard '*'
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/rate-cards', rateCardRoutes);
app.use('/api/cod-configs', codConfigRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/agents', agentRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Central error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Last-Mile API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
