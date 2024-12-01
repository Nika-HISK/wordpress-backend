import { IsNotEmpty, IsNumber } from 'class-validator';

export class WpUserIdDto {
  @IsNotEmpty()
  @IsNumber()
  WpUserId: number;
}
