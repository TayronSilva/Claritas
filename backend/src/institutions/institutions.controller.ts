import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { InstitutionsService } from './institutions.service';

class CreateInstitutionBody {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'PILOT'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fundSharePct?: number;

  @IsOptional()
  @IsString()
  treasuryPub?: string;
}

@ApiTags('institutions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly service: InstitutionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: CreateInstitutionBody) {
    return this.service.create(body);
  }

  @Get('dashboard/:id')
  dashboard(@Param('id') id: string) {
    return this.service.dashboard(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
