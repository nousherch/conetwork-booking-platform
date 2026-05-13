const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
const pktOffset = 5 * 60 * 60 * 1000;
const pktNow = new Date(now.getTime() + pktOffset);
const pktMidnight = new Date(pktNow);
pktMidnight.setUTCHours(0, 0, 0, 0);
const startOfToday = new Date(pktMidnight.getTime() - pktOffset);
const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      todayTotal,
      monthTotal,
      activeClients,
      activeRooms,
      upcomingBookings,
    ] = await Promise.all([
      prisma.booking.count({
        where: { status: 'CONFIRMED', startTime: { gte: startOfToday, lte: endOfToday } },
      }),
      prisma.booking.count({
        where: { status: { not: 'CANCELLED' }, startTime: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.room.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED', startTime: { gte: now } },
        include: {
          room: { select: { name: true, color: true } },
          client: { include: { user: { select: { name: true } } } },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),
    ]);

    res.json({
      stats: { todayTotal, monthTotal, activeClients, activeRooms },
      upcomingBookings,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

const getClientDashboard = async (req, res) => {
  try {
    const clientId = req.user.client?.id;
    if (!clientId) return res.status(400).json({ error: 'Client profile not found' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [upcomingBookings, monthlyBookings, allBookings] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId, status: 'CONFIRMED', startTime: { gte: now } },
        include: { room: { select: { name: true, color: true } } },
        orderBy: { startTime: 'asc' },
        take: 5,
      }),
      prisma.booking.findMany({
        where: {
          clientId,
          status: { not: 'CANCELLED' },
          startTime: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.booking.findMany({
        where: { clientId },
        include: { room: { select: { name: true, color: true } } },
        orderBy: { startTime: 'desc' },
        take: 20,
      }),
    ]);

    // Calculate monthly hours
    const monthlyHours = monthlyBookings.reduce((total, b) => {
      const duration = (b.endTime - b.startTime) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    res.json({
      upcomingBookings,
      monthlyBookings: monthlyBookings.length,
      monthlyHours: Math.round(monthlyHours * 10) / 10,
      bookingHistory: allBookings,
    });
  } catch (err) {
    console.error('Client dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();

    let startDate;
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' },
        startTime: { gte: startDate },
      },
      include: {
        room: { select: { id: true, name: true } },
        client: { include: { user: { select: { name: true } } } },
      },
    });

    // Room utilization
    const roomStats = {};
    const clientStats = {};
    const hourStats = new Array(24).fill(0);
    const dailyStats = {};

    bookings.forEach((b) => {
      const duration = (b.endTime - b.startTime) / (1000 * 60 * 60);
      const hour = b.startTime.getHours();
      const date = b.startTime.toISOString().split('T')[0];

      // Room stats
      if (!roomStats[b.roomId]) roomStats[b.roomId] = { name: b.room.name, hours: 0, count: 0 };
      roomStats[b.roomId].hours += duration;
      roomStats[b.roomId].count++;

      // Client stats
      const clientKey = b.clientId;
      if (!clientStats[clientKey]) clientStats[clientKey] = { name: b.client.user.name, hours: 0, count: 0 };
      clientStats[clientKey].hours += duration;
      clientStats[clientKey].count++;

      // Peak hours
      hourStats[hour]++;

      // Daily trends
      if (!dailyStats[date]) dailyStats[date] = { date, bookings: 0, hours: 0 };
      dailyStats[date].bookings++;
      dailyStats[date].hours += duration;
    });

    const topRooms = Object.values(roomStats)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map((r) => ({ ...r, hours: Math.round(r.hours * 10) / 10 }));

    const topClients = Object.values(clientStats)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
      .map((c) => ({ ...c, hours: Math.round(c.hours * 10) / 10 }));

    const peakHours = hourStats.map((count, hour) => ({
      hour: `${hour}:00`,
      bookings: count,
    }));

    const dailyTrends = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ topRooms, topClients, peakHours, dailyTrends, totalBookings: bookings.length });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

const exportReport = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;

    const where = { status: { not: 'CANCELLED' } };
    if (startDate) where.startTime = { gte: new Date(startDate) };
    if (endDate) {
      if (!where.startTime) where.startTime = {};
      where.startTime.lte = new Date(endDate);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: { select: { name: true } },
        client: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const data = bookings.map((b) => ({
      'Booking ID': b.id,
      'Title': b.title,
      'Client': b.client.user.name,
      'Email': b.client.user.email,
      'Room': b.room.name,
      'Start Time': b.startTime.toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
      'End Time': b.endTime.toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
      'Duration (hrs)': Math.round(((b.endTime - b.startTime) / 3600000) * 10) / 10,
      'Status': b.status,
      'Created': b.createdAt.toLocaleDateString('en-PK'),
    }));

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=conetwork-bookings.xlsx');
      res.send(buffer);
    } else {
      // CSV
      const headers = Object.keys(data[0] || {});
      const csvRows = [headers.join(',')];
      data.forEach((row) => {
        const values = headers.map((h) => `"${row[h] || ''}"`);
        csvRows.push(values.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=conetwork-bookings.csv');
      res.send(csvRows.join('\n'));
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export report' });
  }
};

module.exports = { getDashboardStats, getClientDashboard, getAnalytics, exportReport };
