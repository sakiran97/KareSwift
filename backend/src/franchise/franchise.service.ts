import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FranchiseService {
  private readonly logger = new Logger(FranchiseService.name);

  constructor(private prisma: PrismaService) {}

  async getActiveFranchises() {
    this.logger.log('Fetching all active franchises');
    return this.prisma.franchise.findMany({
      where: { isActive: true },
      include: { city: true },
    });
  }

  async getServiceZonesByCity(cityId: number) {
    this.logger.log(`Fetching service zones for city ${cityId}`);
    return this.prisma.serviceZone.findMany({
      where: { cityId, isActive: true },
    });
  }

  async assignTechnicianToFranchise(technicianUserId: number, franchiseId: number) {
    this.logger.log(`Assigning tech ${technicianUserId} to franchise ${franchiseId}`);
    return this.prisma.technicianProfile.update({
      where: { userId: technicianUserId },
      data: { franchiseId },
    });
  }
}
