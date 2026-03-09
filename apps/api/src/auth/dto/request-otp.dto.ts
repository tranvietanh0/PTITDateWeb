import { IsEmail, IsString, MaxLength } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;
}
