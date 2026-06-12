import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── App Configuration Defaults ──────────────────────────
  const configs = [
    {
      key: 'service_radius_km',
      value: '10',
      description: 'Maximum distance in km to match nearby technicians to customer orders',
    },
    {
      key: 'max_orders_per_slot',
      value: '3',
      description: 'Maximum number of orders allowed per time slot before disabling it',
    },
    {
      key: 'max_active_orders_per_technician',
      value: '1',
      description: 'Maximum active orders a technician can hold simultaneously',
    },
    {
      key: 'technician_location_ping_sec',
      value: '30',
      description: 'How often (in seconds) online technicians send GPS location updates',
    },
    {
      key: 'search_timeout_sec',
      value: '120',
      description: 'How long (in seconds) to search for nearby technicians before timing out',
    },
  ];

  for (const config of configs) {
    await prisma.appConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
    console.log(`  ✅ Config: ${config.key} = ${config.value}`);
  }

  // ── Default Service Categories ──────────────────────────
  const categories = [
    { name: 'Screen Replacement', description: 'Cracked or broken screen repair' },
    { name: 'Battery Swap', description: 'Battery replacement service' },
    { name: 'Software Fix', description: 'OS issues, malware, data recovery' },
    { name: 'Water Damage Repair', description: 'Liquid damage diagnostics and repair' },
    { name: 'Charging Port Fix', description: 'Charging port replacement or repair' },
    { name: 'Camera Repair', description: 'Front or rear camera repair' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });
    console.log(`  ✅ Service: ${cat.name}`);
  }

  // ── Default Devices ─────────────────────────────────────
  const devices = [
    { brand: 'Apple', model: 'iPhone 15 Pro' },
    { brand: 'Samsung', model: 'Galaxy S24 Ultra' },
    { brand: 'Google', model: 'Pixel 8 Pro' },
  ];

  for (const device of devices) {
    const existing = await prisma.device.findFirst({
      where: { brand: device.brand, model: device.model },
    });
    if (!existing) {
      await prisma.device.create({ data: device });
      console.log(`  ✅ Device: ${device.brand} ${device.model}`);
    } else {
      console.log(`  ⏭️  Device exists: ${device.brand} ${device.model}`);
    }
  }

  // ── Free Subscription Plan (Placeholder) ────────────────
  await prisma.subscriptionPlan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free Plan',
      targetRole: 'both',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'INR',
      features: ['basic_orders', 'chat', 'notifications'],
      maxOrdersPerMonth: null, // unlimited
      isActive: true,
    },
  });
  console.log('  ✅ Subscription: Free Plan');

  // ── Admin User ──────────────────────────────────────────
  const adminEmail = 'admin@doorstep.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        role: 'admin',
      },
    });
    console.log('  ✅ Admin user: admin@doorstep.com');
  } else {
    console.log('  ⏭️  Admin exists: admin@doorstep.com');
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
