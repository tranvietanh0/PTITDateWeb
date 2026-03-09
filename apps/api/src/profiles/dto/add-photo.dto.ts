import {
  IsEmail,
  IsInt,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddPhotoDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @IsString()
  @IsUrl()
  url!: string;

  @IsInt()
  @Min(0)
  @Max(10)
  orderIndex!: number;
}
