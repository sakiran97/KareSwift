import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SlotService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; startTime: string; endTime: string; maxBookings?: number; isActive?: boolean }) {
    // Check if slot name already exists
    const existing = await this.prisma.slot.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException(`Slot with name '${data.name}' already exists`);

    return this.prisma.slot.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        maxBookings: data.maxBookings !== undefined ? data.maxBookings : 5,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async findAll(onlyActive = false) {
    return this.prisma.slot.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: number) {
    const slot = await this.prisma.slot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  async update(id: number, data: { name?: string; startTime?: string; endTime?: string; maxBookings?: number; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.slot.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.slot.delete({ where: { id } });
    return { success: true };
  }

  async getAvailableSlotsForDate(dateStr: string) {
    const activeSlots = await this.findAll(true);
    
    // Count orders booked on this date per slot
    const orders = await this.prisma.order.findMany({
      where: {
        scheduledDate: dateStr,
        status: { not: 'CANCELLED' },
      },
      select: { scheduledSlot: true },
    });

    const slotCounts = orders.reduce((acc, order) => {
      if (order.scheduledSlot) {
        acc[order.scheduledSlot] = (acc[order.scheduledSlot] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return activeSlots.map(slot => {
      const bookedCount = slotCounts[slot.name] || 0;
      return {
        slot: slot.name,
        available: bookedCount < slot.maxBookings,
        bookedCount,
        maxCount: slot.maxBookings,
      };
    });
  }
}
