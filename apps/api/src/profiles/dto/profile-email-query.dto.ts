import { IsEmail, IsString, MaxLength } from 'class-validator';

export class ProfileEmailQueryDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;
}
