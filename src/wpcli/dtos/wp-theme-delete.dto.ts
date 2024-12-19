import { IsNotEmpty, IsString } from 'class-validator';

export class WpThemeDeleteDto {
  @IsNotEmpty()
  @IsString()
  theme: string;
}
