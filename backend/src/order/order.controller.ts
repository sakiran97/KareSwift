import { Controller, Get, Post, Body, Param, Patch, Query, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { OrderService } from './order.service';
import { SlotService } from '../slot/slot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Order } from '../generated/prisma';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly slotService: SlotService,
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
      scheduledDate?: string;
      scheduledSlot?: string;
      notes?: string;
      diagnosticNotes?: string;
      diagnosticPhotos?: string[];
      travelCharge?: number;
      serviceAreaId?: number;
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
    return this.slotService.getAvailableSlotsForDate(date);
  }

  @Get('devices')
  async getDevices() {
    return this.orderService.findDevices();
  }

  @Get('categories')
  async getCategories() {
    return this.orderService.findServiceCategories();
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
    @Body('paymentMethod') paymentMethod?: string,
    @Body('repairNotes') repairNotes?: string,
    @Body('otp') otp?: string,
  ) {
    const cleanId = id.startsWith('ORD-') ? id.replace('ORD-', '') : id;
    const parsedId = Number(cleanId);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    return this.orderService.updateStatus(
      parsedId,
      status as any,
      partsUsed,
      laborNotes,
      finalAmount,
      paymentMethod,
      repairNotes,
      otp
    );
  }
}
