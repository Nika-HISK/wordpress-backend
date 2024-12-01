import { IsNotEmpty, IsString } from 'class-validator';

export class WpThemeActivateDto {
  @IsNotEmpty()
  @IsString()
  theme: string;
}
