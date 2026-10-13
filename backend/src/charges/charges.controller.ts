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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChargeStatus } from '@prisma/client';
import { IsISO8601, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ChargesService } from './charges.service';

class CreateChargeBody {
  @IsString()
  institutionId: string;

  @IsString()
  studentId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsISO8601()
  dueDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class GenerateMonthlyBody {
  @IsString()
  institutionId: string;

  @Matches(/^\d{4}-\d{2}$/)
  period: string;
}

class ConfirmPaymentBody {
  @IsString()
  chargeId: string;

  @IsString()
  txSignature: string;

  @IsOptional()
  @IsString()
  payerPub?: string;

  @IsString()
  idempotencyKey: string;
}

@ApiTags('charges')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('charges')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  @Get()
  @ApiQuery({ name: 'institutionId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(ChargeStatus) })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  findAll(
    @Query('institutionId') institutionId: string,
    @Query('status') status?: ChargeStatus,
    @Query('studentId') studentId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.findAll(
      institutionId,
      status,
      studentId,
      take ? Number(take) : 100,
      skip ? Number(skip) : 0,
    );
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @Post()
  create(@Body() body: CreateChargeBody) {
    return this.service.create(body);
  }

  @Post('generate')
  generate(@Body() body: GenerateMonthlyBody) {
    return this.service.generateMonthly(body.institutionId, body.period);
  }

  @Post('mark-overdue')
  markOverdue(@Body() body: { institutionId: string }) {
    return this.service.markOverdue(body.institutionId);
  }

  @Get(':id/link')
  paymentLink(@Param('id') id: string) {
    return this.service.paymentLink(id);
  }

  @Post('confirm')
  confirm(@Body() body: ConfirmPaymentBody) {
    return this.service.confirmPayment(body);
  }
}
