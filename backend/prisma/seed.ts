import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding V2 database...');

  // 1. App Configuration Defaults
  const configs = [
    { key: 'booking_enabled', value: 'true', description: 'Enable or disable customer bookings' },
    { key: 'same_day_booking', value: 'true', description: 'Allow customer to book same-day repairs' },
    { key: 'max_bookings_per_day', value: '10', description: 'Maximum customer bookings allowed per day' },
    { key: 'upi_enabled', value: 'true', description: 'Enable or disable UPI payment option' },
    { key: 'cash_enabled', value: 'true', description: 'Enable or disable cash payment option' },
    { key: 'qr_enabled', value: 'true', description: 'Enable or disable QR payment option' },
    { key: 'qr_image_url', value: 'assets/qr-code-placeholder.png', description: 'URL or path to static QR Code image' },
    { key: 'review_mandatory', value: 'false', description: 'Require reviews after successful repair completion' },
  ];

  for (const config of configs) {
    await prisma.appConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
    console.log(`  ✅ Config: ${config.key} = ${config.value}`);
  }

  // 2. Default Service Categories (Services)
  const categories = [
    { name: 'Screen Replacement', description: 'Cracked, broken, or unresponsive touch screen repairs' },
    { name: 'Battery Replacement', description: 'Low health, swollen, or fast-draining battery replacement' },
    { name: 'Charging Issue', description: 'Charging port cleaning, repair, or charging port swap' },
    { name: 'Speaker Repair', description: 'Muffled, crackly, or non-functional speaker repairs' },
    { name: 'Microphone Repair', description: 'Low volume, crackly, or completely silent mic fixes' },
    { name: 'Camera Repair', description: 'Front or rear camera lens, sensor, or glass replacement' },
    { name: 'Water Damage', description: 'Diagnostics, ultrasonic cleaning, and circuit repair for liquid ingress' },
    { name: 'Software Issue', description: 'Bootloops, OS upgrades, factory resets, or data backup assistance' },
    { name: 'Data Recovery', description: 'Retrieval of files, photos, and contacts from dead or broken devices' },
    { name: 'Other', description: 'General diagnosis and custom repair solutions' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true },
      create: { ...cat, isActive: true },
    });
    console.log(`  ✅ Service Category: ${cat.name}`);
  }

  // 3. Default Devices
  const devices = [
    { brand: 'Apple', model: 'iPhone 15 Pro' },
    { brand: 'Samsung', model: 'Galaxy S24 Ultra' },
    { brand: 'Google', model: 'Pixel 8 Pro' },
    { brand: 'OnePlus', model: 'OnePlus 12' },
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

  // 4. Default Service Areas (Hyderabad)
  const areas = [
    { name: 'ECIL', city: 'Hyderabad', travelCharge: 0 },
    { name: 'Nagaram', city: 'Hyderabad', travelCharge: 0 },
    { name: 'AS Rao Nagar', city: 'Hyderabad', travelCharge: 0 },
    { name: 'Sainikpuri', city: 'Hyderabad', travelCharge: 0 },
    { name: 'Tarnaka', city: 'Hyderabad', travelCharge: 0 },
    { name: 'Uppal', city: 'Hyderabad', travelCharge: 0 },
    { name: 'Habsiguda', city: 'Hyderabad', travelCharge: 0 },
    { name: 'Hitech City', city: 'Hyderabad', travelCharge: 199 },
    { name: 'Gachibowli', city: 'Hyderabad', travelCharge: 199 },
    { name: 'Kondapur', city: 'Hyderabad', travelCharge: 199 },
  ];

  for (const area of areas) {
    const existing = await prisma.serviceArea.findFirst({
      where: { name: area.name, city: area.city },
    });
    if (!existing) {
      await prisma.serviceArea.create({
        data: {
          name: area.name,
          city: area.city,
          travelCharge: area.travelCharge,
          isActive: true,
        },
      });
      console.log(`  ✅ Service Area: ${area.name} (₹${area.travelCharge})`);
    } else {
      await prisma.serviceArea.update({
        where: { id: existing.id },
        data: { travelCharge: area.travelCharge, isActive: true },
      });
      console.log(`  ⏭️  Service Area updated: ${area.name}`);
    }
  }

  // 5. Default Available Slots
  const slots = [
    { name: '09:00 AM', startTime: '09:00', endTime: '11:00', maxBookings: 5 },
    { name: '11:00 AM', startTime: '11:00', endTime: '13:00', maxBookings: 5 },
    { name: '01:00 PM', startTime: '13:00', endTime: '15:00', maxBookings: 5 },
    { name: '03:00 PM', startTime: '15:00', endTime: '17:00', maxBookings: 5 },
    { name: '05:00 PM', startTime: '17:00', endTime: '19:00', maxBookings: 5 },
  ];

  for (const slot of slots) {
    await prisma.slot.upsert({
      where: { name: slot.name },
      update: { startTime: slot.startTime, endTime: slot.endTime, maxBookings: slot.maxBookings, isActive: true },
      create: { ...slot, isActive: true },
    });
    console.log(`  ✅ Slot: ${slot.name}`);
  }

  // 6. Admin Users
  const admins = ['admin@doorstep.com', 'admin@demo.com'];
  for (const adminEmail of admins) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'admin' },
      create: {
        email: adminEmail,
        name: adminEmail === 'admin@demo.com' ? 'Demo Admin' : 'Admin User',
        role: 'admin',
      },
    });
    console.log(`  ✅ Admin user upserted: ${adminEmail}`);
  }

  console.log('\n🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
