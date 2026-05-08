const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getAllClients = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, createdAt: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      clients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        bookings: {
          include: { room: { select: { name: true, color: true } } },
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json({ client });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
};

const createClient = async (req, res) => {
  try {
    const { name, email, password, companyName, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'CLIENT',
        client: {
          create: {
            companyName: companyName?.trim() || null,
            phone: phone?.trim() || null,
            status: 'ACTIVE',
          },
        },
      },
      include: { client: true },
    });

    res.status(201).json({
      client: user.client,
      user: { id: user.id, name: user.name, email: user.email },
      message: 'Client account created successfully',
    });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, companyName, phone, status, password } = req.body;

    const client = await prisma.client.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Update user data
    const userUpdateData = {};
    if (name) userUpdateData.name = name.trim();
    if (email) {
      const conflict = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), NOT: { id: client.userId } },
      });
      if (conflict) return res.status(400).json({ error: 'Email already in use' });
      userUpdateData.email = email.toLowerCase().trim();
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      userUpdateData.password = await bcrypt.hash(password, 12);
    }

    const clientUpdateData = {};
    if (companyName !== undefined) clientUpdateData.companyName = companyName;
    if (phone !== undefined) clientUpdateData.phone = phone;
    if (status) clientUpdateData.status = status;

    const [updatedUser, updatedClient] = await prisma.$transaction([
      prisma.user.update({ where: { id: client.userId }, data: userUpdateData }),
      prisma.client.update({ where: { id }, data: clientUpdateData }),
    ]);

    res.json({
      client: updatedClient,
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
      message: 'Client updated successfully',
    });
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });

    if (client._count.bookings > 0) {
      return res.status(400).json({ error: 'Cannot delete client with active bookings. Cancel all bookings first.' });
    }

    // Deleting user cascades to client
    await prisma.user.delete({ where: { id: client.userId } });

    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
