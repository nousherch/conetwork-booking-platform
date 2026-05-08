require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
const roomRoutes = require('./routes/room.routes');
const clientRoutes = require('./routes/client.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const { sendReminderEmails } = require('./services/email.service');

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://conetwork-booking-platform.vercel.app'
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Cron job: Send meeting reminders every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await sendReminderEmails();
  } catch (err) {
    console.error('Reminder cron error:', err.message);
  }
});

// Cron job: Mark past bookings as COMPLETED at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    await prisma.booking.updateMany({
      where: {
        endTime: { lt: now },
        status: 'CONFIRMED',
      },
      data: { status: 'COMPLETED' },
    });
    console.log('✅ Past bookings marked as completed');
  } catch (err) {
    console.error('Completion cron error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 CoNetwork API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;