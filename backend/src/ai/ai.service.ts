import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async diagnoseDevice(issueDescription: string, photos: string[]): Promise<string> {
    this.logger.log(`Running AI diagnostics for issue: ${issueDescription}`);
    
    const lowerIssue = issueDescription.toLowerCase();
    if (lowerIssue.includes('screen') || lowerIssue.includes('display') || lowerIssue.includes('glass')) {
      return `[AI DIAGNOSIS] It sounds like your screen or display assembly is damaged. I recommend booking a "Screen Replacement" service. Our certified technicians can replace this at your doorstep in under 30 minutes!`;
    } else if (lowerIssue.includes('battery') || lowerIssue.includes('charge') || lowerIssue.includes('power')) {
      return `[AI DIAGNOSIS] Battery drain or charging issues usually indicate a degraded battery health. I recommend our "Battery Swap" service. We use premium, certified batteries with a 90-day warranty.`;
    } else if (lowerIssue.includes('water') || lowerIssue.includes('liquid') || lowerIssue.includes('drop')) {
      return `[AI DIAGNOSIS] Liquid damage requires immediate attention to prevent motherboard corrosion. Please book a "Liquid Damage Diagnostic" immediately and do not attempt to charge your device.`;
    } else {
      return `[AI DIAGNOSIS] Based on your description, I recommend our "General Diagnostic" service. A technician will inspect your device at your doorstep and provide a precise repair quote.`;
    }
  }

  async supportChat(userMessage: string): Promise<string> {
    this.logger.log(`Processing support chat: ${userMessage}`);
    
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi ')) {
      return `Hello there! I'm your virtual assistant. Are you facing an issue with your device, or do you have a question about an existing order?`;
    }
    
    if (lowerMsg.includes('order') && lowerMsg.includes('status')) {
      return `To check your order status, please navigate to your Profile -> Order History. Or, if you provide me with the Order ID (like "ORD-3"), I can look it up.`;
    }
    
    if (lowerMsg.includes('ord-')) {
      const match = userMessage.match(/ORD-\d+/i);
      if (match) {
        return `I see you are asking about order ${match[0].toUpperCase()}. If you need to know why it was cancelled, it is usually because a technician was unavailable at the requested time, or the diagnostic found the device unrepairable. You can try booking again!`;
      }
    }
    
    if (lowerMsg.includes('cancel') || lowerMsg.includes('refund')) {
      return `If your order was cancelled, any advance payment or diagnostic fee is automatically refunded to your Wallet within 24 hours. You can check your Wallet balance in your Profile.`;
    }
    
    if (lowerMsg.includes('warranty') || lowerMsg.includes('guarantee')) {
      return `All our repairs come with a standard 90-Day Warranty. You can view your active warranties in the "Warranties" tab on your dashboard!`;
    }

    return `I understand you need assistance. Could you please provide your Order ID or describe the device issue in more detail? I am continuously learning to help you better!`;
  }
}
