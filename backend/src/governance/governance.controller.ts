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
import { ProposalStatus, ProposalType, VoteChoice } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { GovernanceService } from './governance.service';

class ProposalBody {
  @IsString()
  institutionId: string;

  @IsEnum(ProposalType)
  type: ProposalType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  voteDeadline: string;
}

class VoteBody {
  @IsEnum(VoteChoice)
  choice: VoteChoice;

  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;
}

@ApiTags('governance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  @Get('proposals')
  findAll(
    @Query('institutionId') institutionId: string,
    @Query('status') status?: ProposalStatus,
  ) {
    return this.service.findAll(institutionId, status);
  }

  @Post('proposals')
  @Roles('PLATFORM_ADMIN', 'INSTITUTION_FINANCE', 'COMMITTEE_MEMBER')
  create(@Body() body: ProposalBody, @CurrentUser() user: AuthUser) {
    return this.service.createProposal({
      institutionId: body.institutionId,
      authorId: user.id,
      type: body.type,
      title: body.title,
      description: body.description,
      voteDeadline: new Date(body.voteDeadline),
    });
  }

  @Get('proposals/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('proposals/:id/vote')
  vote(@Param('id') id: string, @Body() body: VoteBody, @CurrentUser() user: AuthUser) {
    return this.service.castVote({
      proposalId: id,
      voterId: user.id,
      voterKind: voterKindFor(user.role),
      choice: body.choice,
      weight: body.weight,
    });
  }

  @Get('proposals/:id/tally')
  tally(@Param('id') id: string) {
    return this.service.tally(id);
  }

  @Post('proposals/:id/close')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  @Get('audit/:institutionId')
  auditTrail(@Param('institutionId') institutionId: string) {
    return this.service.auditTrail(institutionId);
  }

  @Get('anchors')
  anchors(@Query('status') status?: 'PENDING' | 'ANCHORED' | 'FAILED') {
    return this.service.anchors(status);
  }
}

function voterKindFor(role: string): 'STUDENT' | 'COMMITTEE' | 'AUDIT' {
  if (role === 'STUDENT') return 'STUDENT';
  if (role === 'COMMITTEE_MEMBER') return 'COMMITTEE';
  return 'AUDIT';
}
