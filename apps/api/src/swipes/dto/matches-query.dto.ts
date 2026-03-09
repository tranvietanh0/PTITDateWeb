import { IsEmail, IsString, MaxLength } from 'class-validator';

export class MatchesQueryDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;
}
