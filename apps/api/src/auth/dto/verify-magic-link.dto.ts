import { IsString, MinLength } from 'class-validator';

export class VerifyMagicLinkDto {
  @IsString()
  @MinLength(24)
  token!: string;
}
