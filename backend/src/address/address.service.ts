import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, data: {
    fullName: string;
    mobileNumber: string;
    houseNumber: string;
    street: string;
    area: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the user's first address, make it default automatically
    const count = await this.prisma.address.count({ where: { userId } });
    const isDefault = count === 0 ? true : !!data.isDefault;

    return this.prisma.address.create({
      data: {
        userId,
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        houseNumber: data.houseNumber,
        street: data.street,
        area: data.area,
        landmark: data.landmark || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        isDefault,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number, userId: number) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async update(id: number, userId: number, data: {
    fullName?: string;
    mobileNumber?: string;
    houseNumber?: string;
    street?: string;
    area?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    isDefault?: boolean;
  }) {
    const address = await this.findOne(id, userId);

    if (data.isDefault && !address.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        houseNumber: data.houseNumber,
        street: data.street,
        area: data.area,
        landmark: data.landmark !== undefined ? data.landmark : undefined,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        isDefault: data.isDefault,
      },
    });
  }

  async remove(id: number, userId: number) {
    const address = await this.findOne(id, userId);
    await this.prisma.address.delete({ where: { id } });

    // If we deleted the default address, make the most recent one default
    if (address.isDefault) {
      const nextAddress = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (nextAddress) {
        await this.prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  async setDefault(id: number, userId: number) {
    await this.findOne(id, userId);

    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
