import { IsOptional, IsString } from 'class-validator';

export class WpSearchQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}