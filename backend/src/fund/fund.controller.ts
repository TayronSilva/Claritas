import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FundService, type EconomyInput } from './fund.service';

class EconomyBody implements EconomyInput {
  @IsString()
  institutionId: string;

  @IsString()
  period: string;

  @IsOptional()
  @IsNumber()
  bankFeePerLiquidation?: number;

  @IsOptional()
  @IsNumber()
  newVariableCostPerPayment?: number;

  @IsOptional()
  @IsNumber()
  platformFeePerStudent?: number;

  @IsOptional()
  @IsNumber()
  platformFeePerLiquidation?: number;
}

class FundBody {
  @IsString()
  institutionId: string;

  @IsString()
  period: string;
}

class ContributeBody {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  txSignature?: string;
}

@ApiTags('fund')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fund')
export class FundController {
  constructor(private readonly service: FundService) {}

  @Get('stats/:institutionId')
  stats(@Param('institutionId') institutionId: string) {
    return this.service.stats(institutionId);
  }

  @Get(':institutionId')
  findAll(@Param('institutionId') institutionId: string) {
    return this.service.findAll(institutionId);
  }

  @Post('economy/preview')
  preview(@Body() body: EconomyBody) {
    return this.service.computeEconomy(body);
  }

  @Post('economy')
  createReport(@Body() body: EconomyBody) {
    return this.service.createReport(body);
  }

  @Post('create')
  create(@Body() body: FundBody) {
    return this.service.createFund(body.institutionId, body.period);
  }

  @Post(':id/contribute')
  contribute(@Param('id') id: string, @Body() body: ContributeBody) {
    return this.service.contribute(id, body.amount, body.txSignature);
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
