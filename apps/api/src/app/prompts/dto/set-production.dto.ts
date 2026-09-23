import { IsInt, Min } from 'class-validator';

export class SetProductionDto {
  @IsInt()
  @Min(1)
  version!: number;
}
