import { IsInt, IsUrl, Max, Min } from 'class-validator';

export class AddPhotoDto {
  @IsUrl({
    require_protocol: true,
    require_tld: false,
    require_host: true,
    protocols: ['http', 'https'],
  })
  url!: string;

  @IsInt()
  @Min(0)
  @Max(10)
  orderIndex!: number;
}
