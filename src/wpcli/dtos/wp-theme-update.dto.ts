import { IsString } from 'class-validator';

export class WpThemeUpdateDto {
  @IsString()
  theme: string;
}