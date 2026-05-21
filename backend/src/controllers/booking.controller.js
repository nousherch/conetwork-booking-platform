const { PrismaClient } = require('@prisma/client');
const { sendBookingConfirmation, sendBookingCancellation } = require('../services/email.service');

const prisma = new PrismaClient();

// Convert PKT time string to UTC Date
const pktToUtc = (timeStr) => {
  const date = new Date(timeStr);
  return new Date(date.getTime() - 5 * 60 * 60 * 1000);
};

// Validate booking time rules (30-min increments, min 30 mins)
const validateBookingTime = (startTime, endTime) => {
  const start = pktToUtc(startTime);
  const end = pktToUtc(endTime);
  const now = new Date();

  if (start < now) return 'Booking start time cannot be in the past';
  if (end <= start) return 'End time must be after start time';

  const durationMs = end - start;
  const durationMins = durationMs / (1000 * 60);

  if (durationMins < 30) return 'Minimum booking duration is 30 minutes';
  if (durationMins % 30 !== 0) return 'Booking duration must be in 30-minute increments';

  const startMins = start.getMinutes();
  if (startMins !== 0 && startMins !== 30) return 'Start time must be on the hour or half hour';

  return null;
};

// Check for conflicting bookings
const checkConflict = async (roomId, startTime, endTime, excludeBookingId = null) => {
  const where = {
    roomId,
    status: 'CONFIRMED',
    AND: [
      { startTime: { lt: pktToUtc(endTime) } },
      { endTime: { gt: pktToUtc(startTime) } },
    ],
  };
  if (excludeBookingId) where.id = { not: excludeBookingId };
  const conflict = await prisma.booking.findFirst({ where });
  return conflict;
};

const getAllBookings = async (req, res) => {
  try {
    const { clientId, roomId, status, startDate, endDate, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (req.user.role === 'CLIENT') {
      where.clientId = req.user.client?.id;
    } else {
      if (clientId) where.clientId = clientId;
    }

    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          room: { select: { id: true, name: true, color: true } },
          client: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      bookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        room: true,
        client: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role === 'CLIENT' && booking.clientId !== req.user.client?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

const createBooking = async (req, res) => {
  try {
    const { roomId, title, startTime, endTime, notes } = req.body;

    if (!roomId || !title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Room, title, start time, and end time are required' });
    }

    const timeError = validateBookingTime(startTime, endTime);
    if (timeError) return res.status(400).json({ error: timeError });

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status === 'INACTIVE') return res.status(400).json({ error: 'Room is not available' });

    let clientId;
    if (req.user.role === 'ADMIN') {
      clientId = req.body.clientId;
      if (!clientId) return res.status(400).json({ error: 'Client ID required for admin bookings' });
    } else {
      clientId = req.user.client?.id;
      if (!clientId) return res.status(400).json({ error: 'Client profile not found' });
    }

    const conflict = await checkConflict(roomId, startTime, endTime);
    if (conflict) {
      return res.status(409).json({
        error: 'This time slot is already booked',
        conflict: {
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          title: conflict.title,
        },
      });
    }

    const booking = await prisma.booking.create({
      data: {
        clientId,
        roomId,
        title,
        startTime: pktToUtc(startTime),
        endTime: pktToUtc(endTime),
        notes: notes || null,
        status: 'CONFIRMED',
      },
      include: {
        room: true,
        client: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    try {
      await sendBookingConfirmation(booking);
    } catch (emailErr) {
      console.error('Email error (non-fatal):', emailErr.message);
    }

    res.status(201).json({ booking, message: 'Booking confirmed successfully' });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, notes, status } = req.body;

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { room: true, client: { include: { user: true } } },
    });

    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role === 'CLIENT' && existing.clientId !== req.user.client?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot edit a cancelled booking' });
    }

    // Allow end early — skip validation if only endTime is being set to now or past
    const isEndEarly = endTime && !startTime && new Date(endTime) <= new Date();

    if (startTime && endTime && !isEndEarly) {
      const timeError = validateBookingTime(startTime, endTime);
      if (timeError) return res.status(400).json({ error: timeError });

      const conflict = await checkConflict(existing.roomId, startTime, endTime, id);
      if (conflict) {
        return res.status(409).json({ error: 'Time slot conflict with existing booking' });
      }
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(startTime && { startTime: new Date(startTime) }),
        // For end early use raw new Date, for normal update use pktToUtc
        ...(endTime && { endTime: isEndEarly ? new Date(endTime) : new Date(endTime) }),
        ...(notes !== undefined && { notes }),
        ...(status && req.user.role === 'ADMIN' && { status }),
      },
      include: {
        room: true,
        client: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    res.json({ booking, message: 'Booking updated successfully' });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        client: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role === 'CLIENT' && booking.clientId !== req.user.client?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        room: true,
        client: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    try {
      await sendBookingCancellation(updated);
    } catch (emailErr) {
      console.error('Email error (non-fatal):', emailErr.message);
    }

    res.json({ booking: updated, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

const getCalendarBookings = async (req, res) => {
  try {
    const { start, end, roomId } = req.query;

    if (!start || !end) return res.status(400).json({ error: 'Start and end dates required' });

    const where = {
      status: 'CONFIRMED',
      AND: [
        { startTime: { gte: new Date(start) } },
        { startTime: { lt: new Date(end) } },
      ],
    };

    if (roomId) where.roomId = roomId;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, color: true } },
        client: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const currentClientId = req.user.client?.id;

    const events = bookings.map((b) => {
      const isOwnBooking = req.user.role === 'ADMIN' || b.clientId === currentClientId;
      return {
        id: b.id,
        title: isOwnBooking
          ? (req.user.role === 'ADMIN' ? `${b.title} — ${b.client.user.name}` : b.title)
          : '🔒 Booked',
        start: b.startTime,
        end: b.endTime,
        backgroundColor: isOwnBooking ? b.room.color : '#ef4444',
        borderColor: isOwnBooking ? b.room.color : '#dc2626',
        textColor: '#ffffff',
        classNames: isOwnBooking ? [] : ['booked-by-other'],
        extendedProps: {
          roomId: b.roomId,
          roomName: b.room.name,
          clientId: b.clientId,
          clientName: b.client.user.name,
          notes: b.notes,
          status: b.status,
          isOwnBooking,
        },
      };
    });

    res.json({ events });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
};

const getTodaysBookings = async (req, res) => {
  try {
    const now = new Date();
    const pktOffset = 5 * 60 * 60 * 1000;
    const pktNow = new Date(now.getTime() + pktOffset);
    const todayPKT = new Date(pktNow);
    todayPKT.setUTCHours(0, 0, 0, 0);
    const today = new Date(todayPKT.getTime() - pktOffset);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const where = {
      status: 'CONFIRMED',
      startTime: { gte: today, lt: tomorrow },
    };

    if (req.user.role === 'CLIENT') where.clientId = req.user.client?.id;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, color: true } },
        client: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today\'s bookings' });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getCalendarBookings,
  getTodaysBookings,
};