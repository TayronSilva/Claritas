import { Module } from '@nestjs/common';
import { ChargesService } from './charges.service';
import { ChargesController } from './charges.controller';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';

@Module({
  controllers: [ChargesController, BatchesController],
  providers: [ChargesService, BatchesService],
  exports: [ChargesService, BatchesService],
})
export class ChargesModule {}
