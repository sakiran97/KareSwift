import { Controller, Get, Post, Body, Param, Patch, Query, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Order } from '../../generated/prisma';
import { ConfigService } from '../config/config.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.id ? Number(req.user.id) : null;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    if (req.user.role === 'admin') {
      return this.orderService.findAll();
    }
    if (req.user.role === 'technician') {
      return this.orderService.findByTechnicianId(userId);
    }
    return this.orderService.findByUserId(userId);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() createOrderDto: { 
      userId: number; 
      deviceId: number; 
      serviceCategoryId: number; 
      estimatedTime?: number;
      address?: string;
      latitude?: number;
      longitude?: number;
      scheduledDate?: string;
      scheduledSlot?: string;
      notes?: string;
      diagnosticNotes?: string;
      diagnosticPhotos?: string[];
    }
  ) {
    const userId = req.user?.id ? Number(req.user.id) : createOrderDto.userId;
    const order = await this.orderService.create({ ...createOrderDto, userId });
    return {
      orderId: String(order.id),
      id: order.id,
      ...order
    };
  }

  @Get('available-slots')
  async getAvailableSlots(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Date query parameter is required');
    }
    const allSlots = [
      "09:00 AM - 11:00 AM",
      "11:00 AM - 01:00 PM",
      "01:00 PM - 03:00 PM",
      "03:00 PM - 05:00 PM",
      "05:00 PM - 07:00 PM"
    ];
    const maxPerSlot = await this.configService.getNumber('max_orders_per_slot').catch(() => 3);
    const bookedSlots = await this.orderService.findBookedSlots(date);
    
    // Count occurrences of each slot booked
    const slotCounts = bookedSlots.reduce((acc, slot) => {
      acc[slot] = (acc[slot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return allSlots.map(slot => {
      const bookedCount = slotCounts[slot] || 0;
      return {
        slot,
        available: bookedCount < maxPerSlot,
        bookedCount,
        maxCount: maxPerSlot
      };
    });
  }

  @Get('devices')
  async getDevices() {
    return this.orderService.findDevices();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Order> {
    const cleanId = id.startsWith('ORD-') ? id.replace('ORD-', '') : id;
    const parsedId = Number(cleanId);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    return this.orderService.findById(parsedId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('partsUsed') partsUsed?: string,
    @Body('laborNotes') laborNotes?: string,
    @Body('finalAmount') finalAmount?: number,
  ) {
    const cleanId = id.startsWith('ORD-') ? id.replace('ORD-', '') : id;
    const parsedId = Number(cleanId);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    return this.orderService.updateStatus(parsedId, status as any, partsUsed, laborNotes, finalAmount);
  }

  // getInvoice endpoint was removed in accordance with Phase 5 (Remove Payment & Price Estimation)
}
