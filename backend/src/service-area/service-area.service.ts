import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ServiceAreaService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; city: string; travelCharge: number; isActive?: boolean; pincodes?: string[] }) {
    return this.prisma.serviceArea.create({
      data: {
        name: data.name,
        city: data.city,
        pincodes: data.pincodes || [],
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

  async update(id: number, data: { name?: string; city?: string; travelCharge?: number; isActive?: boolean; pincodes?: string[] }) {
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

    // Find a service area that includes this exact pincode
    const serviceArea = await this.prisma.serviceArea.findFirst({
      where: {
        pincodes: {
          has: address.pincode,
        },
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

  async checkPincode(pincode: string) {
    const serviceArea = await this.prisma.serviceArea.findFirst({
      where: {
        pincodes: {
          has: pincode,
        },
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
