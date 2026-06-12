import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  async calculateFinalPrice(basePrice: number, location: { lat: number, lng: number }): Promise<number> {
    this.logger.log(`Calculating surge pricing for base price: ${basePrice}`);
    
    // Fetch active modifiers from DB
    const modifiers = await this.prisma.pricingModifier.findMany({
      where: { isActive: true }
    });

    let multiplier = 1.0;
    
    // Simplified logic: simulate a peak hour check
    const currentHour = new Date().getHours();
    if (currentHour >= 17 && currentHour <= 20) {
      const peakModifier = modifiers.find(m => m.conditionType === 'time');
      if (peakModifier) {
        multiplier = Math.max(multiplier, peakModifier.multiplier);
      } else {
        multiplier = Math.max(multiplier, 1.2); // Default 1.2x if not configured
      }
    }

    // You could also use the location (lat/lng) to calculate demand heatmaps here
    
    const finalPrice = basePrice * multiplier;
    this.logger.log(`Final calculated price: ${finalPrice} (Multiplier: ${multiplier})`);
    return finalPrice;
  }
}
