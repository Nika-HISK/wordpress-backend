import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class WpUserIdDto {
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  WpUserId: number;
}
