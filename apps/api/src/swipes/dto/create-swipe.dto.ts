import { SwipeAction } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateSwipeDto {
  @IsString()
  @MinLength(10)
  targetUserId!: string;

  @IsEnum(SwipeAction)
  action!: SwipeAction;
}
