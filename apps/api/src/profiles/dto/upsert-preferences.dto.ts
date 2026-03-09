import { Gender } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertPreferencesDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

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
