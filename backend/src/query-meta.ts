import * as dotenv from 'dotenv';
import * as path from 'path';
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('--- SERVICE CATEGORIES ---');
  console.log(await prisma.serviceCategory.findMany());

  console.log('\n--- DEVICES ---');
  console.log(await prisma.device.findMany());

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
