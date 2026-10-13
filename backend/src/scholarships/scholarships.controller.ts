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
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { ScholarshipsService } from './scholarships.service';

class PublishRuleBody {
  @IsOptional()
  weights?: Record<string, number>;

  @IsOptional()
  tierCutoffs?: Record<string, number>;
}

class EvaluateBody {
  @ApiProperty({ example: 'claritas' })
  @IsString()
  institutionId: string;

  @ApiProperty({ example: '2026-10' })
  @Matches(/^\d{4}-\d{2}$/)
  period: string;
}

class AllocateBody {
  @IsString()
  institutionId: string;

  @Matches(/^\d{4}-\d{2}$/)
  period: string;

  @IsString()
  fundId: string;
}

@ApiTags('scholarships')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('scholarships')
export class ScholarshipsController {
  constructor(private readonly service: ScholarshipsService) {}

  @Get('rule/:institutionId')
  getRule(@Param('institutionId') institutionId: string) {
    return this.service.getActiveRule(institutionId);
  }

  @Post('rule/:institutionId/publish')
  publishRule(
    @Param('institutionId') institutionId: string,
    @Body() body: PublishRuleBody,
  ) {
    return this.service.publishRule(institutionId, body.weights, body.tierCutoffs);
  }

  @Get('preview/:studentId')
  preview(@Param('studentId') studentId: string) {
    return this.service.previewScore(studentId);
  }

  @Post('evaluate')
  evaluate(@Body() body: EvaluateBody) {
    return this.service.evaluatePeriod(body.institutionId, body.period);
  }

  @Get('ranking')
  ranking(
    @Query('institutionId') institutionId: string,
    @Query('period') period: string,
  ) {
    return this.service.ranking(institutionId, period);
  }

  @Post('allocate')
  allocate(@Body() body: AllocateBody) {
    return this.service.allocate(body.institutionId, body.period, body.fundId);
  }
}
