import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  async getWallet(userId: number) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!wallet) {
      // Create empty wallet if it doesn't exist yet
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { transactions: true }
      });
    }

    return wallet;
  }

  async addFunds(userId: number, amount: number, referenceId: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    this.logger.log(`Adding ${amount} to wallet for user ${userId}`);

    // Use a transaction to ensure balance is updated safely
    return await this.prisma.$transaction(async (prisma) => {
      let wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await prisma.wallet.create({ data: { userId } });
      }

      // Add transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Prisma.Decimal(amount),
          type: 'credit',
          description: 'Added funds via Payment Gateway',
          referenceId
        }
      });

      // Update balance
      const newBalance = Number(wallet.balance) + amount;
      return await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal(newBalance) },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });
    });
  }

  async deductFunds(userId: number, amount: number, description: string, referenceId?: string, allowNegative: boolean = false) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return await this.prisma.$transaction(async (prisma) => {
      let wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        if (allowNegative) {
          wallet = await prisma.wallet.create({ data: { userId, balance: 0 } });
        } else {
          throw new NotFoundException('Wallet not found');
        }
      }

      const currentBalance = Number(wallet.balance);
      if (!allowNegative && currentBalance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Add transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Prisma.Decimal(amount),
          type: 'debit',
          description,
          referenceId
        }
      });

      // Update balance
      const newBalance = currentBalance - amount;
      return await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal(newBalance) }
      });
    });
  }
}
