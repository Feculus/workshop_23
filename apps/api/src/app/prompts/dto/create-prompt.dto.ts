import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreatePromptDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, {
    message:
      'promptKey must be lowercase alphanumeric with optional - or _ separators',
  })
  promptKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
