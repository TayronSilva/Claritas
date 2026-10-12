import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email ja cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        institutionId: dto.institutionId,
        passwordHash,
        ...(dto.role === 'STUDENT' && dto.studentId
          ? { student: { connect: { id: dto.studentId } } }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        institutionId: true,
      },
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    if (!user.isActive) throw new UnauthorizedException('Usuario inativo');

    return this.issueToken({
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    });
  }

  async listUsers(institutionId?: string) {
    return this.prisma.user.findMany({
      where: institutionId ? { institutionId } : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        institutionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async inviteUser(dto: {
    email: string;
    name: string;
    role: 'PLATFORM_ADMIN' | 'INSTITUTION_FINANCE' | 'COMMITTEE_MEMBER' | 'STUDENT';
    institutionId?: string | null;
    password?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email ja cadastrado');

    const passwordHash = await bcrypt.hash(dto.password ?? 'claritas123', 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        institutionId: dto.institutionId ?? null,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        institutionId: true,
        createdAt: true,
      },
    });
  }

  private async issueToken(user: {
    id: string;
    email: string;
    role: string;
    institutionId: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    };

    return {
      accessToken: await this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '12h') as StringValue,
      }),
      user,
    };
  }
}
