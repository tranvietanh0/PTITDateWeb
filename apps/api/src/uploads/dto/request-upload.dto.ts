import { IsEmail, IsString, IsOptional, MaxLength } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;
}
