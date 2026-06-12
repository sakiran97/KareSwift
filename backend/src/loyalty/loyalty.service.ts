import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from '../order/order.service';

@Injectable()
export class LoyaltyService {
  private useMock = false;
  private mockAccounts: Map<number, any> = new Map();
  private mockTransactions: any[] = [];
  private nextMockTxId = 1;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}

  private isDbOffline(err: any) {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }

  async getAccount(userId: number) {
    if (!this.useMock) {
      try {
        let account = await this.prisma.loyaltyAccount.findUnique({
          where: { userId },
          include: {
            user: { select: { name: true } },
          },
        });

        if (!account) {
          // Create default account
          account = await this.prisma.loyaltyAccount.create({
            data: {
              userId,
              points: 0,
              tier: 'Bronze',
              totalOrders: 0,
              totalSpent: 0.00,
            },
            include: {
              user: { select: { name: true } },
            },
          });
        }

        const transactions = await this.prisma.pointTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return {
          ...account,
          transactions,
        };
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    let mockAccount = this.mockAccounts.get(userId);
    if (!mockAccount) {
      mockAccount = {
        userId,
        points: 0,
        tier: 'Bronze',
        totalOrders: 0,
        totalSpent: 0.00,
        updatedAt: new Date(),
      };
      this.mockAccounts.set(userId, mockAccount);
    }

    const txs = this.mockTransactions
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      ...mockAccount,
      transactions: txs,
    };
  }

  async awardPointsForCompletedOrder(orderId: number, userId: number) {
    // Award a flat 100 points per completed repair order (since pricing is offline now)
    const pointsToAward = 100;
    const orderTotal = 0;

    if (!this.useMock) {
      try {
        await this.prisma.$transaction(async (tx) => {
          let account = await tx.loyaltyAccount.findUnique({ where: { userId } });
          if (!account) {
            account = await tx.loyaltyAccount.create({
              data: { userId, points: 0, tier: 'Bronze', totalOrders: 0, totalSpent: 0.00 },
            });
          }

          const newPoints = account.points + pointsToAward;
          const newTotalSpent = Number(account.totalSpent) + orderTotal;
          const newTotalOrders = account.totalOrders + 1;
          const newTier = this.calculateTier(newPoints);

          await tx.loyaltyAccount.update({
            where: { userId },
            data: {
              points: newPoints,
              totalSpent: newTotalSpent,
              totalOrders: newTotalOrders,
              tier: newTier,
            },
          });

          await tx.pointTransaction.create({
            data: {
              userId,
              points: pointsToAward,
              type: 'earned',
              description: `Earned points for completed repair order #${orderId}`,
              orderId,
            },
          });
        });
        return;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    let mockAccount = this.mockAccounts.get(userId);
    if (!mockAccount) {
      mockAccount = {
        userId,
        points: 0,
        tier: 'Bronze',
        totalOrders: 0,
        totalSpent: 0.00,
        updatedAt: new Date(),
      };
    }

    mockAccount.points += pointsToAward;
    mockAccount.totalSpent = Number(mockAccount.totalSpent) + orderTotal;
    mockAccount.totalOrders += 1;
    mockAccount.tier = this.calculateTier(mockAccount.points);
    mockAccount.updatedAt = new Date();
    this.mockAccounts.set(userId, mockAccount);

    this.mockTransactions.push({
      id: this.nextMockTxId++,
      userId,
      points: pointsToAward,
      type: 'earned',
      description: `Earned points for completed repair order #${orderId} (Mock)`,
      orderId,
      createdAt: new Date(),
    });
  }

  async redeemPoints(userId: number, optionId: string) {
    // Reward options:
    // option-1: 100 points -> ₹100 Discount Code
    // option-2: 300 points -> Free Screen Guard
    // option-3: 500 points -> ₹600 Discount Code
    const options = [
      { id: 'option-1', points: 100, label: '₹100 Off Repair' },
      { id: 'option-2', points: 300, label: 'Free Screen Guard / Charging Cable' },
      { id: 'option-3', points: 500, label: '₹600 Off Repair' },
    ];

    const selectedOption = options.find(o => o.id === optionId);
    if (!selectedOption) throw new BadRequestException('Invalid redemption option');

    if (!this.useMock) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const account = await tx.loyaltyAccount.findUnique({ where: { userId } });
          if (!account || account.points < selectedOption.points) {
            throw new BadRequestException('Insufficient points balance');
          }

          const newPoints = account.points - selectedOption.points;
          const newTier = this.calculateTier(newPoints);

          await tx.loyaltyAccount.update({
            where: { userId },
            data: {
              points: newPoints,
              tier: newTier,
            },
          });

          const code = `REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

          const txRecord = await tx.pointTransaction.create({
            data: {
              userId,
              points: -selectedOption.points,
              type: 'redeemed',
              description: `Redeemed ${selectedOption.points} points for "${selectedOption.label}". Promo Code: ${code}`,
            },
          });

          return {
            success: true,
            promoCode: code,
            pointsRedeemed: selectedOption.points,
            remainingPoints: newPoints,
          };
        });
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    const mockAccount = this.mockAccounts.get(userId);
    if (!mockAccount || mockAccount.points < selectedOption.points) {
      throw new BadRequestException('Insufficient points balance (Mock)');
    }

    mockAccount.points -= selectedOption.points;
    mockAccount.tier = this.calculateTier(mockAccount.points);
    mockAccount.updatedAt = new Date();
    this.mockAccounts.set(userId, mockAccount);

    const code = `MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    this.mockTransactions.push({
      id: this.nextMockTxId++,
      userId,
      points: -selectedOption.points,
      type: 'redeemed',
      description: `Redeemed ${selectedOption.points} points for "${selectedOption.label}". Promo Code: ${code} (Mock)`,
      createdAt: new Date(),
    });

    return {
      success: true,
      promoCode: code,
      pointsRedeemed: selectedOption.points,
      remainingPoints: mockAccount.points,
    };
  }

  private calculateTier(points: number): string {
    if (points >= 5000) return 'Platinum';
    if (points >= 2000) return 'Gold';
    if (points >= 500) return 'Silver';
    return 'Bronze';
  }
}
