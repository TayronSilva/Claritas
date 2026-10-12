import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LedgerEntryType } from '@prisma/client';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ledger')
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Get('entries')
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'type', required: false, enum: Object.values(LedgerEntryType) })
  entries(
    @Query('institutionId') institutionId: string,
    @Query('type') type?: LedgerEntryType,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.findAll(institutionId, {
      type,
      take: take ? Number(take) : 200,
      skip: skip ? Number(skip) : 0,
    });
  }

  @Get('balances/:institutionId')
  balances(@Param('institutionId') institutionId: string) {
    return this.service.balances(institutionId);
  }

  @Get('impact/:institutionId')
  impact(@Param('institutionId') institutionId: string) {
    return this.service.socialImpact(institutionId);
  }
}
