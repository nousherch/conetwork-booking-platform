const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllRooms = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    // Non-admin only sees active rooms
    if (req.user.role !== 'ADMIN') where.status = 'ACTIVE';

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ rooms });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

const getRoomById = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

const createRoom = async (req, res) => {
  try {
    const { name, capacity, equipment, description, color, status } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({ error: 'Name and capacity are required' });
    }

    // Check duplicate name
    const existing = await prisma.room.findFirst({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Room with this name already exists' });

    const room = await prisma.room.create({
      data: {
        name,
        capacity: parseInt(capacity),
        equipment: equipment || [],
        description: description || null,
        color: color || '#10b981',
        status: status || 'ACTIVE',
      },
    });

    res.status(201).json({ room, message: 'Room created successfully' });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { name, capacity, equipment, description, color, status } = req.body;
    const { id } = req.params;

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(equipment !== undefined && { equipment }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(status && { status }),
      },
    });

    res.json({ room, message: 'Room updated successfully' });
  } catch (err) {
    console.error('Update room error:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const bookings = await prisma.booking.count({
      where: { roomId: id, status: 'CONFIRMED' },
    });

    if (bookings > 0) {
      return res.status(400).json({ error: 'Cannot delete room with active bookings' });
    }

    await prisma.room.delete({ where: { id } });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

const getRoomAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: 'Date parameter required' });

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: id,
        status: 'CONFIRMED',
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
      },
      include: {
        client: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Build available slots (8am - 8pm, 30-min increments)
    const slots = [];
    let currentTime = new Date(startOfDay);
    currentTime.setHours(8, 0, 0, 0);
    const endTime = new Date(startOfDay);
    endTime.setHours(20, 0, 0, 0);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000);
      const isBooked = bookings.some(
        (b) => currentTime < b.endTime && slotEnd > b.startTime
      );
      const isPast = currentTime < new Date();

      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        status: isPast ? 'past' : isBooked ? 'booked' : 'available',
      });

      currentTime = slotEnd;
    }

    res.json({ room, bookings, slots });
  } catch (err) {
    console.error('Get availability error:', err);
    res.status(500).json({ error: 'Failed to get availability' });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomAvailability,
};
