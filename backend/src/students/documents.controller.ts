import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { StudentsService } from './students.service';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
]);

const DOC_TYPES = [
  'Comprovante de Renda (Holerite, DECORE ou Extrato)',
  'Histórico Escolar / Rendimento Acadêmico',
  'Comprovante de Residência Atualizado',
  'Outros Documentos Complementares',
];

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly students: StudentsService) {}

  @Get('types')
  types() {
    return { types: DOC_TYPES, maxBytes: MAX_BYTES };
  }

  /**
   * Documentos pessoais nao vao para a blockchain. Gravamos em disco,
   * guardamos apenas o hash do arquivo na referencia do aluno.
   */
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatorio');

    const ext = extname(file.originalname).toLowerCase();
    const mime = ALLOWED.get(ext);
    if (!mime) {
      throw new BadRequestException('Formato aceito: PDF, JPG ou PNG');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Arquivo acima de 10 MB');
    }

    const buffer = file.buffer ?? Buffer.alloc(0);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const stored = `${randomUUID()}${ext}`;

    const dir = join(process.cwd(), 'uploads', user.institutionId ?? 'sem-instituicao');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, stored), buffer);

    const reference = `sha256:${sha256.slice(0, 32)}`;
    const studentId = await this.resolveStudentId(user);
    await this.students.attachDocument(studentId, reference);

    return {
      ok: true,
      fileName: file.originalname,
      storedAs: stored,
      bytes: file.size,
      mimeType: mime,
      documentsRef: reference,
      uploadedAt: new Date().toISOString(),
    };
  }

  private async resolveStudentId(user: AuthUser): Promise<string> {
    const student = await this.students.findMe(user.id);
    return student.id;
  }
}