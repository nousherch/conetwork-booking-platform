const router = require('express').Router();
const {
  getDashboardStats,
  getClientDashboard,
  getAnalytics,
  exportReport,
} = require('../controllers/analytics.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', getDashboardStats); // Admin only
router.get('/client-dashboard', getClientDashboard); // Client
router.get('/reports', requireAdmin, getAnalytics);
router.get('/export', requireAdmin, exportReport);

module.exports = router;
