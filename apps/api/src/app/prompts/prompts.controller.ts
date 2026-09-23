import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PromptVersionSelector } from '@pvs/prompts-domain';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { SetProductionDto } from './dto/set-production.dto';
import { PromptsService } from './prompts.service';

function parseVersionSelector(raw?: string): PromptVersionSelector {
  if (raw === undefined || raw === 'production') return 'production';
  const version = Number(raw);
  if (!Number.isInteger(version) || version < 1) {
    throw new BadRequestException(
      `version must be a positive integer or "production", got "${raw}"`
    );
  }
  return version;
}

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  create(@Body() dto: CreatePromptDto) {
    return this.promptsService.create(dto);
  }

  @Post(':promptKey/versions')
  createVersion(
    @Param('promptKey') promptKey: string,
    @Body() dto: CreateVersionDto
  ) {
    return this.promptsService.createVersion(promptKey, dto);
  }

  @Get(':promptKey/versions')
  listVersions(@Param('promptKey') promptKey: string) {
    return this.promptsService.listVersions(promptKey);
  }

  @Get(':promptKey/versions/:version')
  getExplicitVersion(
    @Param('promptKey') promptKey: string,
    @Param('version') version: string
  ) {
    return this.promptsService.getVersion(
      promptKey,
      parseVersionSelector(version)
    );
  }

  /**
   * Defaults to whichever version is currently tagged production when
   * `?version=` is omitted.
   */
  @Get(':promptKey')
  getByDefault(
    @Param('promptKey') promptKey: string,
    @Query('version') version?: string
  ) {
    return this.promptsService.getVersion(
      promptKey,
      parseVersionSelector(version)
    );
  }

  @Post(':promptKey/production')
  setProduction(
    @Param('promptKey') promptKey: string,
    @Body() dto: SetProductionDto
  ) {
    return this.promptsService.setProductionVersion(promptKey, dto.version);
  }
}
