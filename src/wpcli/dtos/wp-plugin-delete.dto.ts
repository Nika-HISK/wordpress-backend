import { IsString } from 'class-validator';

export class WpPluginDeleteDto {
  @IsString()
  plugin: string;
}