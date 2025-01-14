import { IsString, IsInt, IsEnum } from 'class-validator';

export class UpdateRedirectDto {
  @IsInt()
  statusCode: 301 | 302;

  @IsString()
  oldUrl: string;

  @IsString()
  newUrl: string;

  @IsEnum(['add', 'remove'])
  action: 'add' | 'remove';

  @IsString()
  namespace: string;
}