import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
