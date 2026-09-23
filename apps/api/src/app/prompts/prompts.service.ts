import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DuplicatePromptKeyError,
  PromptNotFoundError,
  PromptVersionNotFoundError,
  PromptVersionSelector,
} from '@pvs/prompts-domain';
import { db, PromptsRepository } from '@pvs/prompts-data-access';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class PromptsService {
  private readonly repository = new PromptsRepository(db);

  async create(dto: CreatePromptDto) {
    try {
      return await this.repository.create(dto);
    } catch (error) {
      if (error instanceof DuplicatePromptKeyError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  async createVersion(promptKey: string, dto: CreateVersionDto) {
    try {
      return await this.repository.createVersion({ promptKey, ...dto });
    } catch (error) {
      if (error instanceof PromptNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  async listVersions(promptKey: string) {
    try {
      return await this.repository.listVersions(promptKey);
    } catch (error) {
      if (error instanceof PromptNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  async getVersion(promptKey: string, selector: PromptVersionSelector) {
    try {
      return await this.repository.getVersion(promptKey, selector);
    } catch (error) {
      if (
        error instanceof PromptNotFoundError ||
        error instanceof PromptVersionNotFoundError
      ) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  async setProductionVersion(promptKey: string, version: number) {
    try {
      return await this.repository.setProductionVersion(promptKey, version);
    } catch (error) {
      if (
        error instanceof PromptNotFoundError ||
        error instanceof PromptVersionNotFoundError
      ) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
