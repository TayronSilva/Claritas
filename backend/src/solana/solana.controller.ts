import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SolanaService } from './solana.service';

@ApiTags('solana')
@Controller('solana')
export class SolanaController {
  constructor(private readonly service: SolanaService) {}

  @Get('status')
  status() {
    return this.service.getStatus();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('confirm')
  confirm(@Body() body: { signature: string }) {
    return this.service.getConfirmation(body.signature);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('hash')
  hash(@Body() body: Record<string, unknown>) {
    return { payloadHash: SolanaService.hashPayload(body) };
  }
}
