import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { StudentsService } from './students.service';

class CreateStudentBody {
  @IsString()
  institutionId: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  course: string;

  @IsNumber()
  @Min(0)
  monthlyFee: number;

  @IsOptional()
  @IsString()
  enrollmentCode?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'TRUNCATED', 'GRADUATED', 'DROPPED'])
  status?: string;

  @IsOptional()
  @IsInt()
  intakeYear?: number;
}

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Post()
  create(@Body() body: CreateStudentBody) {
    return this.service.create(body);
  }

  @Get()
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  findAll(
    @Query('institutionId') institutionId: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.findAll(
      institutionId,
      status,
      take ? Number(take) : 50,
      skip ? Number(skip) : 0,
    );
  }

  @Get('me')
  findMe(@CurrentUser() user: AuthUser) {
    return this.service.findMe(user.id);
  }

  @Get('enrollment/:institutionId/:code')
  findByEnrollment(
    @Param('institutionId') institutionId: string,
    @Param('code') code: string,
  ) {
    return this.service.findByEnrollment(institutionId, code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
