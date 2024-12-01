import { IsString } from 'class-validator';

export class WpPluginUpdateDto {
  @IsString()
  plugin: string;
}