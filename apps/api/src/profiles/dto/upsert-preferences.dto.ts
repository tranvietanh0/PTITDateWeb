import { Gender } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpsertPreferencesDto {
  @IsInt()
  @Min(18)
  @Max(80)
  minAge!: number;

  @IsInt()
  @Min(18)
  @Max(80)
  maxAge!: number;

  @IsInt()
  @Min(1)
  @Max(200)
  distanceKm!: number;

  @IsOptional()
  @IsEnum(Gender)
  interestedIn?: Gender;
}
