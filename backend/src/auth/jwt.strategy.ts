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
      secretOrKey: process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long',
    });
  }

  async validate(payload: any) {
    // Supabase JWT payload contains email
    try {
      const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
      if (user) {
        const { passwordHash, ...result } = user;
        return result; // attaches to request.user
      }
    } catch (err: any) {
      console.warn('JWT validation: DB offline, using token payload as user context.');
    }
    // Return payload data if DB lookup fails or user not found in DB
    return { id: payload.sub, email: payload.email, role: payload.role || 'customer' };
  }
}

