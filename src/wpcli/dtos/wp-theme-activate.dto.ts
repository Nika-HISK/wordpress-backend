import { IsLowercase, IsNotEmpty, IsString } from 'class-validator';

export class WpThemeActivateDto {
  @IsLowercase()
  @IsNotEmpty()
  @IsString()
  theme: string;
}
