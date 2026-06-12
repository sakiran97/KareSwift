import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private prisma: PrismaService) {}

  async calculatePayout(orderAmount: number, technicianId: number): Promise<{ platformFee: number, technicianPayout: number }> {
    this.logger.log(`Calculating payout for order amount: ${orderAmount}, Tech: ${technicianId}`);
    
    // Default flat 20% commission if no rules apply
    let platformFeePercentage = 0.20;

    // Fetch active rules
    const rules = await this.prisma.commissionRule.findMany({
      where: { isActive: true, targetRole: 'technician' }
    });

    if (rules.length > 0) {
      // Find a percentage rule
      const rule = rules.find(r => r.type === 'percentage');
      if (rule) {
        platformFeePercentage = Number(rule.value) / 100;
      }
    }

    const platformFee = orderAmount * platformFeePercentage;
    const technicianPayout = orderAmount - platformFee;

    this.logger.log(`Platform Fee: ${platformFee}, Payout: ${technicianPayout}`);
    return { platformFee, technicianPayout };
  }
}
