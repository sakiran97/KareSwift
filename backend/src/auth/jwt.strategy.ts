import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { Request } from 'express';

const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long',
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

