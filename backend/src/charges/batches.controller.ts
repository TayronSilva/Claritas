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
import { IsIn, IsString } from 'class-validator';
import { BatchesService } from './batches.service';

class CreateBatchBody {
  @IsString()
  institutionId: string;

  @IsIn([/^\d{4}-\d{2}$/])
  period: string;
}

@ApiTags('batches')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Get()
  findAll(@Query('institutionId') institutionId: string) {
    return this.service.findAll(institutionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('settle')
  settle(@Body() body: CreateBatchBody) {
    return this.service.createAndSettle(body.institutionId, body.period);
  }
}
