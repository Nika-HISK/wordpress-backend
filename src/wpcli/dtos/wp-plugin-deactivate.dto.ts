import { IsString } from 'class-validator';

export class WpPluginDeactivateDto {
  @IsString()
  plugin: string;
}