import { IsLowercase, IsNotEmpty, IsString } from 'class-validator';

export class WpPluginDeactivateDto {
  @IsNotEmpty()
  @IsLowercase()
  @IsString()
  plugin: string;
}