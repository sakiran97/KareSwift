import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ServiceAreaService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; city: string; travelCharge: number; isActive?: boolean }) {
    return this.prisma.serviceArea.create({
      data: {
        name: data.name,
        city: data.city,
        travelCharge: data.travelCharge,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async findAll(onlyActive = false) {
    return this.prisma.serviceArea.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const area = await this.prisma.serviceArea.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('Service area not found');
    return area;
  }

  async update(id: number, data: { name?: string; city?: string; travelCharge?: number; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.serviceArea.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.serviceArea.delete({ where: { id } });
    return { success: true };
  }

  async checkAvailability(addressId: number) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address not found');

    // Perform exact case-insensitive match on the area name and city
    const serviceArea = await this.prisma.serviceArea.findFirst({
      where: {
        name: { equals: address.area, mode: 'insensitive' },
        city: { equals: address.city, mode: 'insensitive' },
        isActive: true,
      },
    });

    if (!serviceArea) {
      return { available: false, travelCharge: 0 };
    }

    return {
      available: true,
      travelCharge: Number(serviceArea.travelCharge),
      serviceAreaId: serviceArea.id,
    };
  }
}
