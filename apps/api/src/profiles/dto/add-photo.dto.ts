import { IsInt, IsUrl, Max, Min } from 'class-validator';

export class AddPhotoDto {
  @IsUrl()
  url!: string;

  @IsInt()
  @Min(0)
  @Max(10)
  orderIndex!: number;
}
