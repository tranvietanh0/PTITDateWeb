import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;
}
