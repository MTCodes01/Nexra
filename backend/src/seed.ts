import 'dotenv/config';
import prisma from './prisma/client';
import argon2 from 'argon2';

async function main() {
  const hostPassword = await argon2.hash('admin123');

  const host = await prisma.host.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hostPassword,
    },
  });

  console.log({ host });
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
