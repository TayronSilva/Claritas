import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AuthService } from './auth.service';

class InviteUserBody {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsIn(['PLATFORM_ADMIN', 'INSTITUTION_FINANCE', 'COMMITTEE_MEMBER', 'STUDENT'])
  role: 'PLATFORM_ADMIN' | 'INSTITUTION_FINANCE' | 'COMMITTEE_MEMBER' | 'STUDENT';

  @IsOptional()
  @IsString()
  institutionId?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list(@Query('institutionId') institutionId?: string) {
    return this.authService.listUsers(institutionId);
  }

  @Post()
  invite(@Body() body: InviteUserBody) {
    return this.authService.inviteUser(body);
  }
}
