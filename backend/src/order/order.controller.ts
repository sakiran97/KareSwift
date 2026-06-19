import { Controller, Get, Post, Body, Param, Patch, Query, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { OrderService } from './order.service';
import { SlotService } from '../slot/slot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Order } from '../generated/prisma';
import { CreateOrderDto, UpdateOrderStatusDto } from '../common/dto/order.dto';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly slotService: SlotService,
  ) {}

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: any,
    @Body() createOrderDto: CreateOrderDto
  ) {
    const userId = req.user?.id ? Number(req.user.id) : (createOrderDto.userId as number);
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Order> {
    const cleanId = id.startsWith('ORD-') ? id.replace('ORD-', '') : id;
    const parsedId = Number(cleanId);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    return this.orderService.findById(parsedId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    const cleanId = id.startsWith('ORD-') ? id.replace('ORD-', '') : id;
    const parsedId = Number(cleanId);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    return this.orderService.getTimeline(parsedId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const cleanId = id.startsWith('ORD-') ? id.replace('ORD-', '') : id;
    const parsedId = Number(cleanId);
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid order ID format');
    }
    return this.orderService.updateStatus(
      parsedId,
      updateOrderStatusDto.status as any,
      updateOrderStatusDto.partsUsed,
      updateOrderStatusDto.laborNotes,
      updateOrderStatusDto.finalAmount,
      updateOrderStatusDto.paymentMethod,
      updateOrderStatusDto.repairNotes,
      updateOrderStatusDto.otp
    );
  }
}
