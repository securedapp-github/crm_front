require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { sequelize } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import models and associations
const models = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const dealRoutes = require('./routes/dealRoutes');
const taskRoutes = require('./routes/taskRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const noteRoutes = require('./routes/noteRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const accountRoutes = require('./routes/accountRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const devRoutes = require('./routes/devRoutes');
const leadRoutes = require('./routes/leadRoutes');
const salesRoutes = require('./routes/salesRoutes');

// Initialize express app
const app = express();

// Set up middleware
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
app.use(cors({ 
  origin: [FRONTEND_URL, 'http://localhost:5173'], 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions (MySQL store)
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 30 * 24 * 60 * 60 * 1000
});

app.use(session({
  name: 'crm.sid',
  secret: process.env.SESSION_SECRET || 'replace_me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/sales', salesRoutes);

// Error handling middleware (must be after all other middleware and routes)
app.use(errorHandler);

// Set up database connection and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established');

    // Sync all models with the database
    // In development, use alter to apply non-destructive schema changes automatically
    const isProd = process.env.NODE_ENV === 'production'
    await sequelize.sync(isProd ? { force: false } : { alter: true });
    console.log('Database synced');

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.log(`UnhandledRejection: ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
});

module.exports = app;