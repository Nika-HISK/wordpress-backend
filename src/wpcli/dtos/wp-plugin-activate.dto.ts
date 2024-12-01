import { IsNotEmpty, IsString } from 'class-validator';

export class WpPluginActivateDto {
  @IsNotEmpty()
  @IsString()
  plugin: string;
}
