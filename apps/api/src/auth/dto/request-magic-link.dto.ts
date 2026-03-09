import { IsEmail, IsString, MaxLength } from 'class-validator';

export class RequestMagicLinkDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;
}
