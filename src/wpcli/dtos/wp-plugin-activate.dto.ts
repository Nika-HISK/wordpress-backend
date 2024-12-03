import { IsLowercase, IsNotEmpty, IsString } from 'class-validator';

export class WpPluginActivateDto {
  @IsLowercase()
  @IsNotEmpty()
  @IsString()
  plugin: string;
}
