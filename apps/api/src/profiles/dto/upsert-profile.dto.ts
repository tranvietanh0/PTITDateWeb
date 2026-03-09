import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertProfileDto {
  @IsString()
  @MaxLength(80)
  displayName!: string;

  @IsDateString()
  dob!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  @MaxLength(400)
  bio!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  faculty?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseYear?: number;
}
