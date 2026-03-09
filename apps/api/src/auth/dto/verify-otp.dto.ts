import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
