import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { DocumentsController } from './documents.controller';

@Module({
  controllers: [StudentsController, DocumentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
