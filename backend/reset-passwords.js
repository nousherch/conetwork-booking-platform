const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fix() {
  const adminHash = await bcrypt.hash('admin123', 12);
  const clientHash = await bcrypt.hash('client123', 12);

  await prisma.user.update({
    where: { email: 'admin@conetwork.pk' },
    data: { password: adminHash }
  });

  await prisma.user.update({
    where: { email: 'demo@client.com' },
    data: { password: clientHash }
  });

  console.log('✅ Passwords reset successfully');
  console.log('   Admin:  admin@conetwork.pk / admin123');
  console.log('   Client: demo@client.com / client123');
  await prisma.$disconnect();
}

fix().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
