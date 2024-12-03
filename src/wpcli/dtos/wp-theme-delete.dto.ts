import { IsLowercase, IsNotEmpty, IsString } from 'class-validator';

export class WpThemeDeleteDto {
  @IsLowercase()
  @IsNotEmpty()
  @IsString()
  theme: string;
}
