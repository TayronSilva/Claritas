import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from './current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  institutionId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub) throw new UnauthorizedException('Token invalido');
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institutionId: payload.institutionId,
    };
  }
}
