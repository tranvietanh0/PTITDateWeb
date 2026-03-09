import { SwipeAction } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSwipeDto {
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  targetUserId!: string;

  @IsEnum(SwipeAction)
  action!: SwipeAction;
}
