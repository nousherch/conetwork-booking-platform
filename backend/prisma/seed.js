const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@conetwork.pk' },
    update: {},
    create: {
      name: 'CoNetwork Admin',
      email: 'admin@conetwork.pk',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create demo client
  const clientPassword = await bcrypt.hash('client123', 12);
  const clientUser = await prisma.user.upsert({
    where: { email: 'demo@client.com' },
    update: {},
    create: {
      name: 'Demo Client',
      email: 'demo@client.com',
      password: clientPassword,
      role: 'CLIENT',
      client: {
        create: {
          companyName: 'Demo Tech Pvt Ltd',
          phone: '+92 300 1234567',
          status: 'ACTIVE',
        },
      },
    },
  });

  console.log('✅ Demo client created:', clientUser.email);

  // Create meeting rooms
  const rooms = [
    {
      name: 'Boardroom Alpha',
      capacity: 10,
      equipment: ['Projector', 'Whiteboard', 'Video Conferencing', 'HDMI'],
      description: 'Premium boardroom with full AV setup. Ideal for executive meetings and presentations.',
      color: '#10b981',
      status: 'ACTIVE',
    },
    {
      name: 'Focus Room Beta',
      capacity: 4,
      equipment: ['TV Screen', 'Whiteboard', 'HDMI'],
      description: 'Compact meeting room for small team sessions and client calls.',
      color: '#3b82f6',
      status: 'ACTIVE',
    },
    {
      name: 'Creative Studio',
      capacity: 6,
      equipment: ['Dual Monitors', 'Whiteboard', 'Webcam', 'HDMI'],
      description: 'Creative space designed for brainstorming and design reviews.',
      color: '#8b5cf6',
      status: 'ACTIVE',
    },
  ];
for (const room of rooms) {
    const existing = await prisma.room.findFirst({ where: { name: room.name } });
    if (!existing) {
      await prisma.room.create({ data: room });
      console.log('✅ Room created:', room.name);
    } else {
      console.log('⏭️ Room already exists:', room.name);
    }
  }
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:  admin@conetwork.pk  /  admin123');
  console.log('   Client: demo@client.com     /  client123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
