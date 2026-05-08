const router = require('express').Router();
const {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getCalendarBookings,
  getTodaysBookings,
} = require('../controllers/booking.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/calendar', getCalendarBookings);
router.get('/today', getTodaysBookings);
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', cancelBooking);

module.exports = router;
