import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { passportJwtSecret } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

const jwksProvider = passportJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: 'https://apqtqdnjgrusomauvuqc.supabase.co/auth/v1/.well-known/jwks.json',
});

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksProvider,
    });
  }

  async validate(payload: any) {
    try {
      if (payload.aud === 'authenticated' && payload.email) {
        // Supabase token
        let user = await this.prisma.user.findUnique({ where: { email: payload.email } });
        if (!user) {
          // Self-heal: create missing user
          user = await this.prisma.user.create({
            data: {
              email: payload.email,
              role: 'customer',
            }
          });
        }
        return user;
      }
    } catch (err: any) {
      console.warn('JWT validation: DB offline or error, using token payload as user context.', err);
    }
    // Fallback using token payload
    const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    return { id: isNaN(userId) ? payload.sub : userId, email: payload.email, role: payload.role || 'customer' };
  }
}

