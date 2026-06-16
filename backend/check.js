const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  console.log('Devices:', await prisma.device.findMany());
  console.log('ServiceCategories:', await prisma.serviceCategory.findMany());
  console.log('ServiceAreas:', await prisma.serviceArea.findMany());
}
main().finally(() => prisma.$disconnect());
