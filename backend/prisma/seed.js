const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient({
  datasourceUrl: 'file:./dev.db'
});

async function main() {
  console.log('Seeding database...');
  
  // Seed ServiceCategories
  const categories = [
    { name: 'Screen Replacement', description: 'Cracked or broken screen repair' },
    { name: 'Battery Swap', description: 'Battery replacement for longer life' },
    { name: 'Software Fix', description: 'OS reinstall, malware removal, or debugging' },
    { name: 'Water Damage Repair', description: 'Liquid damage cleaning and recovery' },
    { name: 'Charging Port Fix', description: 'USB-C / Lightning port replacement' },
    { name: 'Camera Repair', description: 'Front or rear camera module replacement' }
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }

  // Seed some initial devices
  const devices = [
    { brand: 'Apple', model: 'iPhone 15 Pro' },
    { brand: 'Samsung', model: 'Galaxy S24 Ultra' },
    { brand: 'Google', model: 'Pixel 8 Pro' }
  ];

  for (const dev of devices) {
    const existing = await prisma.device.findFirst({
      where: { brand: dev.brand, model: dev.model }
    });
    if (!existing) {
      await prisma.device.create({ data: dev });
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
