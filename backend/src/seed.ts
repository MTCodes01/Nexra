import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './prisma/client';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create host config if not exists
  const existing = await prisma.hostConfig.findFirst();
  if (!existing) {
    const hash = await bcrypt.hash('12345678', 12);
    await prisma.hostConfig.create({
      data: {
        username: 'Sreedev',
        passwordHash: hash,
      },
    });
    console.log('✅ Host created: username=Sreedev, password=12345678');
  } else {
    console.log('ℹ️  Host config already exists, skipping...');
  }

  // Create initial presentation state if not exists
  const stateExists = await prisma.presentationState.findFirst();
  if (!stateExists) {
    await prisma.presentationState.create({
      data: {
        currentSlide: 1,
        totalSlides: 0,
        isStarted: false,
        isBlackScreen: false,
        presenterNotes: '{}',
      },
    });
    console.log('✅ Presentation state initialized');
  }

  console.log('🎉 Seeding complete!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed error:', e);
  prisma.$disconnect();
  process.exit(1);
});
