require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./db/init');
const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const customerRoutes = require('./routes/customerRoutes');
const backupRoutes = require('./routes/backupRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - restrict to configured frontend URL or localhost in development
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'تعداد درخواست‌های ورود بیش از حد مجاز. لطفاً بعداً دوباره تلاش کنید.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'تعداد درخواست‌ها بیش از حد مجاز.' }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/invoices', apiLimiter, invoiceRoutes);
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/backups', apiLimiter, backupRoutes);
app.use('/api/inventory', apiLimiter, inventoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

function startServer() {
  initDatabase();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Manual database backup endpoint is enabled.');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      console.error(`Close the process using port ${PORT}, or start the server with a different PORT value.`);
      console.error(`PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select-Object LocalPort,OwningProcess,State`);
      process.exit(1);
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });
}

startServer();

module.exports = app;
