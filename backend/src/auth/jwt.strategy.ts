import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    // payload contains sub (user id), phone, and role
    try {
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) {
        const { passwordHash, ...result } = user;
        return result; // attaches to request.user
      }
    } catch (err: any) {
      // Database offline — fall back to decoded token payload
      console.warn('JWT validation: DB offline, using token payload as user context.');
    }
    // Return payload data if DB lookup fails or user not found in DB
    return { id: payload.sub, phone: payload.phone, role: payload.role || 'customer' };
  }
}

