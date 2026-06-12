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
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        const decoded = jwt.decode(rawJwtToken, { complete: true });
        if (decoded && typeof decoded === 'object' && decoded.header && decoded.header.kid) {
          // Token has a kid (Key ID), meaning it's an asymmetric RS256 token from Supabase
          jwksProvider(request, rawJwtToken, done);
        } else {
          // Token is a local symmetric token (technician login via JWT_SECRET)
          done(null, process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long');
        }
      },
    });
  }

  async validate(payload: any) {
    try {
      if (payload.aud === 'authenticated' && payload.email) {
        // Supabase token
        let user = await this.prisma.user.findUnique({ where: { email: payload.email } });
        if (!user) {
          // Self-heal: create missing user (in case the Supabase trigger failed or user is older than trigger)
          user = await this.prisma.user.create({
            data: {
              email: payload.email,
              role: 'customer',
            }
          });
        }
        const { passwordHash, ...result } = user;
        return result;
      } else if (payload.sub) {
        // Local technician token
        const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
        if (!isNaN(userId)) {
          const user = await this.prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const { passwordHash, ...result } = user;
            return result;
          }
        }
      }
    } catch (err: any) {
      console.warn('JWT validation: DB offline or error, using token payload as user context.', err);
    }
    // Fallback (might cause 500 if id is string and passed to Prisma)
    return { id: payload.sub, email: payload.email, role: payload.role || 'customer' };
  }
}

